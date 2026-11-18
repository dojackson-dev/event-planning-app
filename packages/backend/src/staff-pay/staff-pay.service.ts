import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import {
  LONG_SHIFT_MINUTES,
  PayType,
  minutesBetween,
  parseApprovedMinutes,
  sanitizeMember,
  sanitizeShift,
  shiftAmount,
  toCsv,
  withinClockWindow,
} from './staff-pay-rules';

const TOKEN_RE = /^[0-9a-f]{32}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_WORKERS_PER_SHIFT = 50;

const SHIFT_SELECT =
  '*, staff_members(id, name, phone, job_title), event(id, name, date)';

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const fmtTime = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

@Injectable()
export class StaffPayService {
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly sms: SmsNotificationsService,
  ) {
    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.eventecos.com'
    ).replace(/\/+$/, '');
  }

  private get admin() {
    return this.supabaseService.getAdminClient();
  }

  private clockLink(token: string) {
    return `${this.frontendUrl}/clock/${token}`;
  }

  // ── Staff roster ────────────────────────────────────────────────

  async listMembers(ownerId: string) {
    const year = new Date().getUTCFullYear();
    const [{ data: members, error }, { data: shifts }] = await Promise.all([
      this.admin
        .from('staff_members')
        .select('*')
        .eq('owner_id', ownerId)
        .order('name', { ascending: true }),
      this.admin
        .from('staff_shifts')
        .select('staff_member_id, approved_amount, shift_date')
        .eq('owner_id', ownerId)
        .in('status', ['approved', 'paid'])
        .gte('shift_date', `${year}-01-01`)
        .lte('shift_date', `${year}-12-31`),
    ]);
    if (error) throw new BadRequestException(error.message);
    const ytd = new Map<string, number>();
    for (const s of shifts ?? []) {
      ytd.set(
        s.staff_member_id,
        (ytd.get(s.staff_member_id) ?? 0) + Number(s.approved_amount ?? 0),
      );
    }
    return (members ?? []).map((m: any) => ({
      ...m,
      ytd_earned: Math.round((ytd.get(m.id) ?? 0) * 100) / 100,
    }));
  }

  async createMember(ownerId: string, input: Record<string, unknown>) {
    const fields = sanitizeMember(input ?? {}, { creating: true });
    const { data, error } = await this.admin
      .from('staff_members')
      .insert({ is_active: true, ...fields, owner_id: ownerId })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new ConflictException(
          'Someone with that phone number is already on your staff list.',
        );
      throw new BadRequestException(error.message);
    }
    return data;
  }

  /** The staff record for this mobile number, created on the spot if the venue has not added them yet. */
  async ensureMember(ownerId: string, input: Record<string, unknown>) {
    const fields = sanitizeMember(input ?? {}, { creating: true });
    const find = async () => {
      const { data } = await this.admin
        .from('staff_members')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('phone', fields.phone)
        .maybeSingle();
      return data;
    };
    const existing = await find();
    if (existing) return existing;
    try {
      return await this.createMember(ownerId, input);
    } catch (err) {
      // Someone added the same number a moment ago; use theirs.
      if (err instanceof ConflictException) {
        const again = await find();
        if (again) return again;
      }
      throw err;
    }
  }

  async updateMember(
    ownerId: string,
    id: string,
    input: Record<string, unknown>,
  ) {
    await this.ownMember(ownerId, id);
    const fields = sanitizeMember(input ?? {}, { creating: false });
    if (Object.keys(fields).length === 0)
      throw new BadRequestException('Nothing to change.');
    const { data, error } = await this.admin
      .from('staff_members')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new ConflictException(
          'Someone with that phone number is already on your staff list.',
        );
      throw new BadRequestException(error.message);
    }
    return data;
  }

  private async ownMember(ownerId: string, id: string) {
    if (!UUID_RE.test(id))
      throw new NotFoundException('Staff member not found');
    const { data } = await this.admin
      .from('staff_members')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Staff member not found');
    return data;
  }

  // ── Shifts ──────────────────────────────────────────────────────

  async listShifts(
    ownerId: string,
    filters: { from?: string; to?: string; status?: string; eventId?: string },
  ) {
    let q = this.admin
      .from('staff_shifts')
      .select(SHIFT_SELECT)
      .eq('owner_id', ownerId)
      .order('shift_date', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(500);
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from))
      q = q.gte('shift_date', filters.from);
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to))
      q = q.lte('shift_date', filters.to);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.eventId && UUID_RE.test(filters.eventId))
      q = q.eq('event_id', filters.eventId);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map((s: any) => this.withTotals(s));
  }

  /** Adds the hours worked so far and the amount the shift would pay, for the manager's screen. */
  private withTotals(shift: any) {
    const worked =
      shift.clock_in_at && shift.clock_out_at
        ? minutesBetween(shift.clock_in_at, shift.clock_out_at)
        : null;
    const minutes = shift.approved_minutes ?? worked;
    const amount =
      shift.approved_amount ??
      (shift.pay_type === 'flat'
        ? shiftAmount('flat', Number(shift.rate), 0)
        : minutes === null
          ? null
          : shiftAmount('hourly', Number(shift.rate), minutes));
    return {
      ...shift,
      worked_minutes: worked,
      amount,
      needs_review: worked !== null && worked > LONG_SHIFT_MINUTES,
      clock_link: this.clockLink(shift.clock_token),
    };
  }

  async createShifts(ownerId: string, input: Record<string, unknown>) {
    const fields = sanitizeShift(input ?? {}, { creating: true });
    const ids = Array.isArray(input.staff_member_ids)
      ? [...new Set(input.staff_member_ids as unknown[])]
      : [];
    if (
      ids.length === 0 ||
      ids.length > MAX_WORKERS_PER_SHIFT ||
      !ids.every((i) => typeof i === 'string' && UUID_RE.test(i))
    )
      throw new BadRequestException('Choose who is working this shift.');

    const { data: members } = await this.admin
      .from('staff_members')
      .select('*')
      .eq('owner_id', ownerId)
      .in('id', ids as string[]);
    if ((members ?? []).length !== ids.length)
      throw new NotFoundException('Staff member not found');
    const inactive = (members ?? []).find((m: any) => !m.is_active);
    if (inactive)
      throw new BadRequestException(
        `${inactive.name} is inactive. Reactivate them before scheduling.`,
      );

    let eventName: string | null = null;
    if (fields.event_id) {
      const { data: event } = await this.admin
        .from('event')
        .select('id, name')
        .eq('id', fields.event_id)
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (!event) throw new NotFoundException('Event not found');
      eventName = event.name;
    }

    const rows = (members ?? []).map((m: any) => ({
      owner_id: ownerId,
      staff_member_id: m.id,
      event_id: fields.event_id ?? null,
      title: fields.title,
      shift_date: fields.shift_date,
      start_time: fields.start_time ?? null,
      end_time: fields.end_time ?? null,
      pay_type: (fields.pay_type ?? m.default_pay_type) as PayType,
      rate: fields.rate ?? Number(m.default_rate),
      notes: fields.notes ?? null,
      status: 'scheduled',
      clock_token: randomBytes(16).toString('hex'),
    }));
    const { data: created, error } = await this.admin
      .from('staff_shifts')
      .insert(rows)
      .select(SHIFT_SELECT);
    if (error) throw new BadRequestException(error.message);

    const sendLink = input.send_link !== false;
    const out: Record<string, unknown>[] = [];
    for (const shift of created ?? []) {
      const member = (members ?? []).find(
        (m: any) => m.id === shift.staff_member_id,
      );
      const texted = sendLink
        ? await this.textShift(shift, member, eventName)
        : false;
      out.push({ ...this.withTotals(shift), texted });
    }
    return out;
  }

  private async textShift(shift: any, member: any, eventName?: string | null) {
    const first = String(member?.name ?? '').split(' ')[0];
    const when = [fmtDate(shift.shift_date), fmtTime(shift.start_time)]
      .filter(Boolean)
      .join(' ');
    const where = eventName ?? shift.event?.name;
    return this.sms.sendOne(
      member?.phone,
      `Eventecos Shifts\nHi ${first}, you are scheduled: ${shift.title}${where ? ` (${where})` : ''}, ${when}. Clock in and out with this link: ${this.clockLink(shift.clock_token)}`,
    );
  }

  private async ownShift(ownerId: string, id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException('Shift not found');
    const { data } = await this.admin
      .from('staff_shifts')
      .select(SHIFT_SELECT)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Shift not found');
    return data;
  }

  async updateShift(
    ownerId: string,
    id: string,
    input: Record<string, unknown>,
  ) {
    const shift = await this.ownShift(ownerId, id);
    if (shift.status !== 'scheduled')
      throw new ConflictException(
        'Only a shift that has not started can be edited.',
      );
    const fields = sanitizeShift(input ?? {}, { creating: false });
    if (Object.keys(fields).length === 0)
      throw new BadRequestException('Nothing to change.');
    if (fields.event_id) {
      const { data: event } = await this.admin
        .from('event')
        .select('id')
        .eq('id', fields.event_id)
        .eq('owner_id', ownerId)
        .maybeSingle();
      if (!event) throw new NotFoundException('Event not found');
    }
    const { error } = await this.admin
      .from('staff_shifts')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .eq('status', 'scheduled');
    if (error) throw new BadRequestException(error.message);
    return this.withTotals(await this.ownShift(ownerId, id));
  }

  async cancelShift(ownerId: string, id: string) {
    const shift = await this.ownShift(ownerId, id);
    if (['approved', 'paid'].includes(shift.status))
      throw new ConflictException(
        'An approved shift cannot be cancelled. It is part of payroll history.',
      );
    await this.admin
      .from('staff_shifts')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .in('status', ['scheduled', 'clocked_in', 'submitted']);
    return { success: true };
  }

  async resendLink(ownerId: string, id: string) {
    const shift = await this.ownShift(ownerId, id);
    if (!['scheduled', 'clocked_in'].includes(shift.status))
      throw new ConflictException('This shift is no longer open for clocking.');
    const texted = await this.textShift(shift, shift.staff_members);
    return { texted, clock_link: this.clockLink(shift.clock_token) };
  }

  /** Approves hours (or a flat fee) so the shift counts as pay. Hourly pay needs hours; flat pay does not. */
  async approveShift(
    ownerId: string,
    userId: string,
    id: string,
    input: Record<string, unknown>,
  ) {
    const shift = await this.ownShift(ownerId, id);
    const minutesInput = parseApprovedMinutes(input?.minutes);
    const flat = shift.pay_type === 'flat';
    const canApprove =
      shift.status === 'submitted' ||
      (flat && ['scheduled', 'clocked_in'].includes(shift.status));
    if (!canApprove)
      throw new ConflictException(
        shift.status === 'approved' || shift.status === 'paid'
          ? 'This shift is already approved.'
          : 'This shift is not ready for approval yet.',
      );

    const worked =
      shift.clock_in_at && shift.clock_out_at
        ? minutesBetween(shift.clock_in_at, shift.clock_out_at)
        : 0;
    const minutes = minutesInput ?? worked;
    if (!flat && minutes <= 0)
      throw new BadRequestException(
        'Enter the hours worked before approving an hourly shift.',
      );
    if (!flat && minutesInput === undefined && worked > LONG_SHIFT_MINUTES)
      throw new BadRequestException(
        'This shift ran over 16 hours, which usually means a missed clock-out. Enter the correct hours to approve it.',
      );

    const amount = shiftAmount(shift.pay_type, Number(shift.rate), minutes);
    const { data, error } = await this.admin
      .from('staff_shifts')
      .update({
        status: 'approved',
        approved_minutes: flat ? null : minutes,
        approved_amount: amount,
        approved_at: new Date().toISOString(),
        approved_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .eq('status', shift.status)
      .select('id');
    if (error) throw new BadRequestException(error.message);
    if (!data?.length)
      throw new ConflictException('This shift changed. Reload and try again.');
    return this.withTotals(await this.ownShift(ownerId, id));
  }

  // ── Export ──────────────────────────────────────────────────────

  async exportCsv(ownerId: string, from?: string, to?: string) {
    const shifts = await this.listShifts(ownerId, { from, to });
    const rows = shifts
      .filter((s: any) => ['approved', 'paid'].includes(s.status))
      .sort((a: any, b: any) =>
        `${a.staff_members?.name}${a.shift_date}`.localeCompare(
          `${b.staff_members?.name}${b.shift_date}`,
        ),
      )
      .map((s: any) => [
        s.staff_members?.name,
        s.staff_members?.phone,
        s.staff_members?.job_title ?? '',
        s.shift_date,
        s.event?.name ?? '',
        s.title,
        s.pay_type,
        Number(s.rate).toFixed(2),
        s.pay_type === 'hourly'
          ? ((s.approved_minutes ?? 0) / 60).toFixed(2)
          : '',
        Number(s.approved_amount ?? 0).toFixed(2),
        s.status,
      ]);
    return toCsv(
      [
        'Worker',
        'Phone',
        'Job title',
        'Date',
        'Event',
        'Shift',
        'Pay type',
        'Rate',
        'Hours',
        'Amount',
        'Status',
      ],
      rows,
    );
  }

  // ── Worker clock page (no login: the secret link is the credential) ──

  private async byToken(token: string) {
    if (!TOKEN_RE.test(token ?? ''))
      throw new NotFoundException('This link is not valid.');
    const { data } = await this.admin
      .from('staff_shifts')
      .select(SHIFT_SELECT)
      .eq('clock_token', token)
      .maybeSingle();
    if (!data) throw new NotFoundException('This link is not valid.');
    return data;
  }

  /** What the worker may see: no pay rate, no phone numbers, nothing about other staff. */
  private publicShift(shift: any) {
    return {
      worker_first_name: String(shift.staff_members?.name ?? '').split(' ')[0],
      title: shift.title,
      event_name: shift.event?.name ?? null,
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      status: shift.status,
      clock_in_at: shift.clock_in_at,
      clock_out_at: shift.clock_out_at,
      pay_type: shift.pay_type,
    };
  }

  async publicView(token: string) {
    return this.publicShift(await this.byToken(token));
  }

  async clockIn(token: string, nowMs: number = Date.now()) {
    const shift = await this.byToken(token);
    if (shift.status === 'clocked_in') return this.publicShift(shift);
    if (shift.status !== 'scheduled')
      throw new ConflictException(
        shift.status === 'cancelled'
          ? 'This shift was cancelled.'
          : 'This shift is already complete.',
      );
    if (!withinClockWindow(shift.shift_date, nowMs))
      throw new BadRequestException(
        `You can clock in around the shift date (${fmtDate(shift.shift_date)}).`,
      );
    const { data } = await this.admin
      .from('staff_shifts')
      .update({
        status: 'clocked_in',
        clock_in_at: new Date(nowMs).toISOString(),
        updated_at: new Date(nowMs).toISOString(),
      })
      .eq('id', shift.id)
      .eq('status', 'scheduled')
      .select(SHIFT_SELECT);
    // A second tap racing the first lands here and just sees the clocked-in shift.
    return this.publicShift(data?.[0] ?? (await this.byToken(token)));
  }

  async clockOut(token: string, nowMs: number = Date.now()) {
    const shift = await this.byToken(token);
    if (['submitted', 'approved', 'paid'].includes(shift.status))
      return this.publicShift(shift);
    if (shift.status !== 'clocked_in')
      throw new ConflictException(
        shift.status === 'cancelled'
          ? 'This shift was cancelled.'
          : 'Clock in before clocking out.',
      );
    const { data } = await this.admin
      .from('staff_shifts')
      .update({
        status: 'submitted',
        clock_out_at: new Date(nowMs).toISOString(),
        updated_at: new Date(nowMs).toISOString(),
      })
      .eq('id', shift.id)
      .eq('status', 'clocked_in')
      .select(SHIFT_SELECT);
    return this.publicShift(data?.[0] ?? (await this.byToken(token)));
  }
}
