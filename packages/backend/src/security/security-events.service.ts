import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { StaffPayService } from '../staff-pay/staff-pay.service';
import { StaffPayoutsService } from '../staff-pay/staff-payouts.service';
import {
  MAX_GUARDS_PER_REQUEST,
  fmtEventDate,
  fmtTime,
  sanitizeAssignmentDetails,
  sanitizePay,
  GuardPay,
  sanitizeGuard,
  withinCheckInWindow,
} from './security-rules';

const TOKEN_RE = /^[0-9a-f]{32}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

@Injectable()
export class SecurityEventsService {
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly sms: SmsNotificationsService,
    private readonly staffPay: StaffPayService,
    private readonly payouts: StaffPayoutsService,
  ) {
    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.eventecos.com'
    ).replace(/\/+$/, '');
  }

  private get admin() {
    return this.supabaseService.getAdminClient();
  }

  private link(token: string) {
    return `${this.frontendUrl}/security/check-in/${token}`;
  }

  private async ownEvent(ownerId: string, eventId: string) {
    if (!UUID_RE.test(eventId)) throw new NotFoundException('Event not found');
    const { data } = await this.admin
      .from('event')
      .select('id, name, date')
      .eq('id', eventId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Event not found');
    return data;
  }

  private withLink(row: any) {
    const { check_in_token, staff_shifts, ...rest } = row;
    return {
      ...rest,
      shift: staff_shifts ?? null,
      check_in_link: this.link(check_in_token),
    };
  }

  /** The guards on an event, in the order they report. */
  async list(ownerId: string, eventId: string) {
    const event = await this.ownEvent(ownerId, eventId);
    const { data, error } = await this.admin
      .from('security')
      .select(
        '*, staff_shifts(id, status, pay_type, rate, approved_amount, clock_out_at)',
      )
      .eq('owner_id', ownerId)
      .eq('event_id', eventId)
      .order('report_time', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return { event, guards: (data ?? []).map((g: any) => this.withLink(g)) };
  }

  /** People the venue has used before who are not yet on this event, for one-tap adding. */
  async directory(ownerId: string, eventId: string) {
    await this.ownEvent(ownerId, eventId);
    const { data } = await this.admin
      .from('security')
      .select('name, phone, event_id, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(500);
    const onEvent = new Set(
      (data ?? [])
        .filter((r: any) => r.event_id === eventId)
        .map((r: any) => r.phone),
    );
    const seen = new Set<string>();
    const out: { name: string; phone: string }[] = [];
    for (const r of data ?? []) {
      if (onEvent.has(r.phone) || seen.has(r.phone)) continue;
      seen.add(r.phone);
      out.push({ name: r.name, phone: r.phone });
    }
    return out;
  }

  /** Adds guards to an event, one row each with its own check-in link, and texts them their post. */
  async assign(
    ownerId: string,
    eventId: string,
    input: Record<string, unknown>,
  ) {
    const event = await this.ownEvent(ownerId, eventId);
    const rawGuards = Array.isArray(input?.guards) ? input.guards : [];
    if (rawGuards.length === 0 || rawGuards.length > MAX_GUARDS_PER_REQUEST)
      throw new BadRequestException('Add at least one guard.');
    const guards = rawGuards.map((g) =>
      sanitizeGuard((g ?? {}) as Record<string, unknown>),
    );
    const details = sanitizeAssignmentDetails(input);
    const pay = sanitizePay(input?.pay);

    const { data: existing } = await this.admin
      .from('security')
      .select('phone')
      .eq('owner_id', ownerId)
      .eq('event_id', eventId);
    const taken = new Set((existing ?? []).map((r: any) => r.phone));
    const skipped: string[] = [];
    const rows: Record<string, unknown>[] = [];
    for (const g of guards) {
      if (taken.has(g.phone)) {
        skipped.push(g.name);
        continue;
      }
      taken.add(g.phone);
      rows.push({
        owner_id: ownerId,
        event_id: eventId,
        name: g.name,
        phone: g.phone,
        ...details,
        check_in_token: randomBytes(16).toString('hex'),
      });
    }
    if (rows.length === 0)
      throw new ConflictException(
        'Everyone you chose is already on this event.',
      );

    const { data: created, error } = await this.admin
      .from('security')
      .insert(rows)
      .select('*');
    if (error) throw new BadRequestException(error.message);

    const sendText = input.send_text !== false;
    const out: Record<string, unknown>[] = [];
    for (const row of created ?? []) {
      const texted = sendText ? await this.textAssignment(row, event) : false;
      let paid = false;
      let pay_error: string | null = null;
      if (pay) {
        try {
          await this.attachPay(ownerId, event, row, details.report_time, pay);
          paid = true;
        } catch (err) {
          // The guard is still on the event; the venue can set up pay from Staff Pay.
          pay_error = (err as Error).message;
        }
      }
      out.push({ ...this.withLink(row), texted, paid, pay_error });
    }
    return { guards: out, skipped };
  }

  /**
   * Makes the guard a staff member (or finds them) and gives them a Staff Pay shift for this event, so
   * their hours are approved and paid like everyone else's. A guard who already has an EventEcos vendor
   * Stripe account keeps it when they open their pay setup link.
   */
  private async attachPay(
    ownerId: string,
    event: { id: string; date: string },
    row: any,
    reportTime: string | null,
    pay: GuardPay,
  ) {
    const member = await this.staffPay.ensureMember(ownerId, {
      name: row.name,
      phone: row.phone,
      job_title: 'Security',
      default_pay_type: pay.pay_type,
      default_rate: pay.rate,
    });
    const [shift] = (await this.staffPay.createShifts(ownerId, {
      staff_member_ids: [member.id],
      title: row.post ? `Security: ${row.post}` : 'Security',
      shift_date: String(event.date).slice(0, 10),
      start_time: reportTime,
      event_id: event.id,
      pay_type: pay.pay_type,
      rate: pay.rate,
      send_link: false,
    })) as { id: string }[];
    await this.admin
      .from('security')
      .update({ staff_shift_id: shift.id })
      .eq('id', row.id);
    if (member.payout_status !== 'ready' && !member.payout_setup_sent_at) {
      await this.payouts.sendSetupLink(ownerId, member.id).catch(() => null);
    }
  }

  private textAssignment(row: any, event: { name: string; date: string }) {
    return this.sms.securityAssigned(
      row.phone,
      String(row.name).split(' ')[0],
      event.name,
      fmtEventDate(event.date),
      undefined,
      {
        reportTime: fmtTime(row.report_time) || undefined,
        post: row.post ?? undefined,
        checkInUrl: this.link(row.check_in_token),
      },
    );
  }

  private async ownGuard(ownerId: string, id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException('Guard not found');
    const { data } = await this.admin
      .from('security')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Guard not found');
    return data;
  }

  private async shiftOf(row: any) {
    if (!row.staff_shift_id) return null;
    const { data } = await this.admin
      .from('staff_shifts')
      .select('id, status, clock_token, clock_out_at')
      .eq('id', row.staff_shift_id)
      .maybeSingle();
    return data ?? null;
  }

  async resend(ownerId: string, id: string) {
    const row = await this.ownGuard(ownerId, id);
    if (!row.event_id)
      throw new BadRequestException('This guard is not on an event.');
    const event = await this.ownEvent(ownerId, row.event_id);
    return {
      texted: await this.textAssignment(row, event),
      check_in_link: this.link(row.check_in_token),
    };
  }

  /** The manager marks a guard arrived (or undoes it) for guards who did not tap their link. */
  async setArrival(ownerId: string, id: string, arrived: boolean) {
    const guard = await this.ownGuard(ownerId, id);
    const shift = await this.shiftOf(guard);
    if (
      !arrived &&
      shift &&
      !['scheduled', 'clocked_in'].includes(shift.status)
    )
      throw new ConflictException(
        'Their hours are already in Staff Pay, so arrival cannot be undone here.',
      );
    const { data, error } = await this.admin
      .from('security')
      .update(
        arrived
          ? {
              arrival_time: new Date().toISOString(),
              arrival_source: 'manager',
              updated_at: new Date().toISOString(),
            }
          : {
              arrival_time: null,
              arrival_source: null,
              updated_at: new Date().toISOString(),
            },
      )
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('*');
    if (error) throw new BadRequestException(error.message);

    // Arrival is the start of a paid guard's hours; undoing it puts the shift back to not started.
    if (shift) {
      if (arrived && shift.status === 'scheduled') {
        await this.staffPay.clockIn(shift.clock_token).catch(() => null);
      } else if (!arrived && shift.status === 'clocked_in') {
        await this.admin
          .from('staff_shifts')
          .update({
            status: 'scheduled',
            clock_in_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shift.id)
          .eq('status', 'clocked_in');
      }
    }
    return this.withLink((data ?? [])[0]);
  }

  /** Removes a guard from the event, cancelling their unpaid shift (hours already submitted must be dealt with first). */
  async remove(ownerId: string, id: string) {
    const guard = await this.ownGuard(ownerId, id);
    const shift = await this.shiftOf(guard);
    if (shift?.status === 'submitted')
      throw new ConflictException(
        'Their hours are waiting for your approval in Staff Pay. Approve or cancel them there first.',
      );
    if (shift && ['scheduled', 'clocked_in'].includes(shift.status)) {
      await this.staffPay.cancelShift(ownerId, shift.id);
    }
    const { error } = await this.admin
      .from('security')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── Guard check-in page (no login: the secret link is the credential) ──

  private async byToken(token: string) {
    if (!TOKEN_RE.test(token ?? ''))
      throw new NotFoundException('This link is not valid.');
    const { data: row } = await this.admin
      .from('security')
      .select('*')
      .eq('check_in_token', token)
      .maybeSingle();
    if (!row) throw new NotFoundException('This link is not valid.');
    let event: { name: string; date: string } | null = null;
    if (row.event_id) {
      const { data } = await this.admin
        .from('event')
        .select('name, date')
        .eq('id', row.event_id)
        .maybeSingle();
      event = data ?? null;
    }
    const shift = await this.shiftOf(row);
    return { row, event, shift };
  }

  private publicShape(
    row: any,
    event: { name: string; date: string } | null,
    shift: { status: string; clock_out_at: string | null } | null,
  ) {
    return {
      guard_first_name: String(row.name).split(' ')[0],
      event_name: event?.name ?? 'the event',
      event_date: event?.date ? String(event.date).slice(0, 10) : null,
      report_time: row.report_time ?? null,
      post: row.post ?? null,
      notes: row.notes ?? null,
      arrived: !!row.arrival_time,
      arrival_time: row.arrival_time ?? null,
      // Paid guards also tell us when they leave, which ends their hours.
      paid: !!row.staff_shift_id,
      left: !!shift && ['submitted', 'approved', 'paid'].includes(shift.status),
      left_time: shift?.clock_out_at ?? null,
    };
  }

  async publicView(token: string) {
    const { row, event, shift } = await this.byToken(token);
    return this.publicShape(row, event, shift);
  }

  async publicArrive(token: string, nowMs: number = Date.now()) {
    const { row, event, shift } = await this.byToken(token);
    if (row.arrival_time) return this.publicShape(row, event, shift);
    if (!event?.date)
      throw new BadRequestException('This assignment is not on an event yet.');
    if (!withinCheckInWindow(event.date, nowMs))
      throw new BadRequestException(
        `You can check in around the event date (${fmtEventDate(event.date)}).`,
      );
    const stamp = new Date(nowMs).toISOString();
    const { data } = await this.admin
      .from('security')
      .update({
        arrival_time: stamp,
        arrival_source: 'guard',
        updated_at: stamp,
      })
      .eq('id', row.id)
      .is('arrival_time', null)
      .select('*');
    // Arriving starts a paid guard's hours.
    if (data?.[0] && shift?.status === 'scheduled') {
      await this.staffPay.clockIn(shift.clock_token, nowMs).catch(() => null);
    }
    // A second tap that raced the first just sees the recorded arrival.
    const fresh = await this.byToken(token);
    return this.publicShape(fresh.row, event, fresh.shift);
  }

  /** A paid guard taps when they leave; that ends their hours and sends them to the venue for approval. */
  async publicLeave(token: string, nowMs: number = Date.now()) {
    const { row, event, shift } = await this.byToken(token);
    if (!shift)
      throw new BadRequestException('This assignment is not set up for pay.');
    if (!row.arrival_time)
      throw new ConflictException('Check in before you clock out.');
    if (shift.status === 'clocked_in') {
      await this.staffPay.clockOut(shift.clock_token, nowMs);
    }
    const fresh = await this.byToken(token);
    return this.publicShape(fresh.row, event, fresh.shift);
  }
}
