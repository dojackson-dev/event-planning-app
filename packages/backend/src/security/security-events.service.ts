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
import {
  MAX_GUARDS_PER_REQUEST,
  fmtEventDate,
  fmtTime,
  sanitizeAssignmentDetails,
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
      .from('events')
      .select('id, name, date')
      .eq('id', eventId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Event not found');
    return data;
  }

  private withLink(row: any) {
    const { check_in_token, ...rest } = row;
    return { ...rest, check_in_link: this.link(check_in_token) };
  }

  /** The guards on an event, in the order they report. */
  async list(ownerId: string, eventId: string) {
    const event = await this.ownEvent(ownerId, eventId);
    const { data, error } = await this.admin
      .from('security')
      .select('*')
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
      out.push({ ...this.withLink(row), texted });
    }
    return { guards: out, skipped };
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
    await this.ownGuard(ownerId, id);
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
    return this.withLink((data ?? [])[0]);
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
        .from('events')
        .select('name, date')
        .eq('id', row.event_id)
        .maybeSingle();
      event = data ?? null;
    }
    return { row, event };
  }

  private publicShape(row: any, event: { name: string; date: string } | null) {
    return {
      guard_first_name: String(row.name).split(' ')[0],
      event_name: event?.name ?? 'the event',
      event_date: event?.date ? String(event.date).slice(0, 10) : null,
      report_time: row.report_time ?? null,
      post: row.post ?? null,
      notes: row.notes ?? null,
      arrived: !!row.arrival_time,
      arrival_time: row.arrival_time ?? null,
    };
  }

  async publicView(token: string) {
    const { row, event } = await this.byToken(token);
    return this.publicShape(row, event);
  }

  async publicArrive(token: string, nowMs: number = Date.now()) {
    const { row, event } = await this.byToken(token);
    if (row.arrival_time) return this.publicShape(row, event);
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
    // A second tap that raced the first just sees the recorded arrival.
    return this.publicShape(
      data?.[0] ?? (await this.byToken(token)).row,
      event,
    );
  }
}
