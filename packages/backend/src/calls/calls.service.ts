import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import * as twilio from 'twilio';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../messaging/twilio.service';
import {
  advanceStatus,
  CallStatus,
  clientLegStatus,
  isTerminal,
  OUTCOMES,
  PRE_CONNECT_STATUSES,
} from './call-status';
import {
  BusinessHours,
  DEFAULT_BUSINESS_HOURS,
  isOpenNow,
  parseBusinessHours,
} from './business-hours';
import { isAllowedDestination, maskNumber, normalizePhone } from './phone';

export const ADMIN_EMAIL = 'admin@eventecos.com';
export const SALES_MANAGER_EMAIL = 'sales@eventecos.com';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAFF_RING_SECONDS = 25;
const CLIENT_RING_SECONDS = 30;
const INBOUND_RING_SECONDS = 20;
const MAX_INBOUND_RINGS = 5;
const STALE_SETUP_SECONDS = 120;
const CODE_TTL_MINUTES = 10;
const CODE_RESEND_SECONDS = 60;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CALLS_PER_NUMBER_PER_HOUR = 5;
const DEFAULT_GREETING =
  'You have reached EventEcos. Please leave your name, number and a short message after the tone.';

export interface CallIdentity {
  userId: string;
  email: string;
  kind: 'admin' | 'sales';
  name: string;
  affiliateId?: string;
  isManager: boolean;
}

export interface CallSettings {
  business_hours: BusinessHours;
  allowed_country_codes: string[];
  max_calls_per_hour: number;
  voicemail_greeting: string;
}

type Row = Record<string, any>;

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly twilioService: TwilioService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  // ── helpers ───────────────────────────────────────────────────

  private fail(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  private baseUrl(): string {
    const base = this.config.get<string>('API_PUBLIC_URL');
    if (!base || !this.twilioService.getBusinessNumber()) {
      throw new ServiceUnavailableException('Calling is not set up yet.');
    }
    return base.replace(/\/+$/, '');
  }

  private hookUrl(path: string, query: Record<string, string> = {}): string {
    const qs = new URLSearchParams(query).toString();
    return `${this.baseUrl()}/calls/hook/${path}${qs ? `?${qs}` : ''}`;
  }

  private isConfigured(): boolean {
    return (
      !!this.config.get<string>('API_PUBLIC_URL') &&
      !!this.twilioService.getBusinessNumber()
    );
  }

  private twiml(build: (r: twilio.twiml.VoiceResponse) => void): string {
    const response = new twilio.twiml.VoiceResponse();
    build(response);
    return response.toString();
  }

  private hangupTwiml(message?: string): string {
    return this.twiml((r) => {
      if (message) r.say(message);
      r.hangup();
    });
  }

  // ── settings ──────────────────────────────────────────────────

  async getSettings(): Promise<CallSettings> {
    const { data, error } = await this.db
      .from('call_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) this.logger.warn(`call_settings unavailable: ${error.message}`);
    const row = (data ?? {}) as Row;
    let hours = DEFAULT_BUSINESS_HOURS;
    if (row.business_hours) {
      try {
        hours = parseBusinessHours(row.business_hours);
      } catch {
        hours = DEFAULT_BUSINESS_HOURS;
      }
    }
    return {
      business_hours: hours,
      allowed_country_codes: row.allowed_country_codes?.length
        ? row.allowed_country_codes
        : ['+1'],
      max_calls_per_hour: row.max_calls_per_hour ?? 20,
      voicemail_greeting: row.voicemail_greeting || DEFAULT_GREETING,
    };
  }

  async saveSettings(input: Partial<CallSettings>): Promise<CallSettings> {
    const patch: Row = { updated_at: new Date().toISOString() };
    if (input.business_hours !== undefined) {
      try {
        patch.business_hours = parseBusinessHours(input.business_hours);
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
    }
    if (input.allowed_country_codes !== undefined) {
      const codes = input.allowed_country_codes;
      if (
        !Array.isArray(codes) ||
        codes.length < 1 ||
        codes.length > 10 ||
        codes.some((c) => typeof c !== 'string' || !/^\+\d{1,4}$/.test(c))
      ) {
        throw new BadRequestException(
          'Allowed country codes look like +1, +44 (1 to 10 of them).',
        );
      }
      patch.allowed_country_codes = [...new Set(codes)];
    }
    if (input.max_calls_per_hour !== undefined) {
      const n = Number(input.max_calls_per_hour);
      if (!Number.isInteger(n) || n < 1 || n > 200) {
        throw new BadRequestException('Calls per hour must be 1 to 200.');
      }
      patch.max_calls_per_hour = n;
    }
    if (input.voicemail_greeting !== undefined) {
      const text = String(input.voicemail_greeting).trim();
      if (text.length < 1 || text.length > 300) {
        throw new BadRequestException(
          'The voicemail greeting must be 1 to 300 characters.',
        );
      }
      patch.voicemail_greeting = text;
    }
    const { error } = await this.db
      .from('call_settings')
      .upsert({ id: 1, ...patch });
    if (error) this.fail('Saving call settings failed', error.message);
    return this.getSettings();
  }

  // ── staff profile and phone verification ──────────────────────

  async ensureStaff(identity: CallIdentity): Promise<Row> {
    const find = () =>
      this.db
        .from('call_staff')
        .select('*')
        .eq('user_id', identity.userId)
        .maybeSingle();
    const { data, error } = await find();
    if (error) this.fail('Staff lookup failed', error.message);
    if (data) return data as Row;

    const { error: insertError } = await this.db.from('call_staff').insert({
      user_id: identity.userId,
      kind: identity.kind,
      display_name: identity.name,
      calling_enabled: identity.kind === 'admin',
    });
    if (insertError && insertError.code !== '23505') {
      this.fail('Staff create failed', insertError.message);
    }
    const { data: created } = await find();
    if (!created) this.fail('Staff create failed', 'row missing');
    return created as Row;
  }

  async profile(identity: CallIdentity) {
    const staff = await this.ensureStaff(identity);
    const settings = await this.getSettings();
    return {
      kind: identity.kind,
      name: identity.name,
      configured: this.isConfigured(),
      callingEnabled: !!staff.calling_enabled,
      receivesInbound: !!staff.receives_inbound,
      mobile: staff.mobile_verified_at ? maskNumber(staff.mobile_e164) : null,
      mobileVerified: !!staff.mobile_verified_at,
      pendingMobile: staff.pending_mobile_e164
        ? maskNumber(staff.pending_mobile_e164)
        : null,
      maxCallsPerHour: settings.max_calls_per_hour,
    };
  }

  private codeHash(userId: string, code: string): string {
    const secret =
      this.config.get<string>('CALL_CODE_SECRET') ||
      this.config.get<string>('TWILIO_AUTH_TOKEN') ||
      'eventecos-call-code';
    return createHmac('sha256', secret)
      .update(`${userId}:${code}`)
      .digest('hex');
  }

  async startMobileVerification(identity: CallIdentity, phone: unknown) {
    const e164 = normalizePhone(phone);
    if (!e164) {
      throw new BadRequestException('Enter a valid cell phone number.');
    }
    const settings = await this.getSettings();
    if (!isAllowedDestination(e164, settings.allowed_country_codes)) {
      throw new ForbiddenException('That number is not in an allowed region.');
    }
    const staff = await this.ensureStaff(identity);
    if (
      staff.verify_sent_at &&
      Date.now() - new Date(staff.verify_sent_at).getTime() <
        CODE_RESEND_SECONDS * 1000
    ) {
      throw new HttpException(
        'Please wait a minute before asking for another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const { error } = await this.db
      .from('call_staff')
      .update({
        pending_mobile_e164: e164,
        verify_code_hash: this.codeHash(identity.userId, code),
        verify_expires_at: new Date(
          Date.now() + CODE_TTL_MINUTES * 60_000,
        ).toISOString(),
        verify_attempts: 0,
        verify_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', identity.userId);
    if (error) this.fail('Saving verification failed', error.message);

    try {
      await this.twilioService.sendSMS(
        e164,
        `Your EventEcos calling code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
      );
    } catch (e) {
      this.logger.error(`Verification text failed: ${(e as Error).message}`);
      throw new HttpException(
        'We could not text that number. Check it and try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return { sentTo: maskNumber(e164) };
  }

  async confirmMobile(identity: CallIdentity, code: unknown) {
    const staff = await this.ensureStaff(identity);
    if (!staff.pending_mobile_e164 || !staff.verify_code_hash) {
      throw new BadRequestException('Ask for a code first.');
    }
    if (
      !staff.verify_expires_at ||
      new Date(staff.verify_expires_at).getTime() < Date.now()
    ) {
      throw new BadRequestException('That code expired. Ask for a new one.');
    }
    if ((staff.verify_attempts ?? 0) >= MAX_CODE_ATTEMPTS) {
      throw new HttpException(
        'Too many tries. Ask for a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.db
      .from('call_staff')
      .update({ verify_attempts: (staff.verify_attempts ?? 0) + 1 })
      .eq('user_id', identity.userId);

    const given = Buffer.from(
      this.codeHash(
        identity.userId,
        (typeof code === 'string' ? code : '').trim(),
      ),
    );
    const expected = Buffer.from(String(staff.verify_code_hash));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new BadRequestException('That code is not right.');
    }

    const { error } = await this.db
      .from('call_staff')
      .update({
        mobile_e164: staff.pending_mobile_e164,
        mobile_verified_at: new Date().toISOString(),
        pending_mobile_e164: null,
        verify_code_hash: null,
        verify_expires_at: null,
        verify_attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', identity.userId);
    if (error) this.fail('Saving verified number failed', error.message);
    return this.profile(identity);
  }

  /** Forgets the number (verified and pending) so it is no longer stored or rung. Calling stays off until a new one is verified. */
  async removeMobile(identity: CallIdentity) {
    await this.ensureStaff(identity);
    const { error } = await this.db
      .from('call_staff')
      .update({
        mobile_e164: null,
        mobile_verified_at: null,
        pending_mobile_e164: null,
        verify_code_hash: null,
        verify_expires_at: null,
        verify_attempts: 0,
        verify_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', identity.userId);
    if (error) this.fail('Removing number failed', error.message);
    return this.profile(identity);
  }

  // ── admin: staff list ─────────────────────────────────────────

  async listStaff() {
    const { data: staffRows, error } = await this.db
      .from('call_staff')
      .select('*');
    if (error) this.fail('Staff list failed', error.message);
    const { data: affiliates } = await this.db
      .from('affiliates')
      .select('user_id, first_name, last_name, email, status');

    const byUser = new Map<string, Row>(
      ((staffRows ?? []) as Row[]).map((s) => [s.user_id, s]),
    );
    const view = (
      userId: string,
      kind: string,
      name: string,
      email?: string,
    ) => {
      const s = byUser.get(userId);
      return {
        userId,
        kind,
        name,
        email: email ?? null,
        callingEnabled: !!s?.calling_enabled,
        receivesInbound: !!s?.receives_inbound,
        mobile: s?.mobile_verified_at ? maskNumber(s.mobile_e164) : null,
        mobileVerified: !!s?.mobile_verified_at,
      };
    };

    const sales = ((affiliates ?? []) as Row[])
      .filter((a) => a.status !== 'inactive')
      .map((a) =>
        view(
          a.user_id,
          'sales',
          [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email,
          a.email,
        ),
      );
    const admins = ((staffRows ?? []) as Row[])
      .filter((s) => s.kind === 'admin')
      .map((s) => view(s.user_id, 'admin', s.display_name || 'Admin'));
    return { staff: [...admins, ...sales] };
  }

  async updateStaff(
    userId: string,
    input: { callingEnabled?: boolean; receivesInbound?: boolean },
  ) {
    if (!UUID_RE.test(userId)) throw new NotFoundException('Staff not found.');
    let staff: Row | null = null;
    {
      const { data } = await this.db
        .from('call_staff')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      staff = data as Row | null;
    }
    if (!staff) {
      const { data: affiliate } = await this.db
        .from('affiliates')
        .select('user_id, first_name, last_name, email, status')
        .eq('user_id', userId)
        .maybeSingle();
      if (!affiliate || (affiliate as Row).status === 'inactive') {
        throw new NotFoundException('Staff not found.');
      }
      const a = affiliate as Row;
      const { error } = await this.db.from('call_staff').insert({
        user_id: userId,
        kind: 'sales',
        display_name:
          [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email,
      });
      if (error && error.code !== '23505') {
        this.fail('Staff create failed', error.message);
      }
      staff = {
        user_id: userId,
        calling_enabled: false,
        receives_inbound: false,
      };
    }

    const calling =
      input.callingEnabled !== undefined
        ? !!input.callingEnabled
        : !!staff.calling_enabled;
    let inbound =
      input.receivesInbound !== undefined
        ? !!input.receivesInbound
        : !!staff.receives_inbound;
    if (!calling) inbound = false;
    if (inbound && !staff.mobile_verified_at) {
      throw new BadRequestException(
        'They need a verified cell phone before they can take incoming calls.',
      );
    }
    const { error } = await this.db
      .from('call_staff')
      .update({
        calling_enabled: calling,
        receives_inbound: inbound,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (error) this.fail('Staff update failed', error.message);
    return this.listStaff();
  }

  // ── outbound ──────────────────────────────────────────────────

  private async resolveTarget(
    identity: CallIdentity,
    source: unknown,
    id: unknown,
  ): Promise<{
    phone: string;
    name: string | null;
    refType: string;
    refId: string;
  }> {
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      throw new NotFoundException('Contact not found.');
    }
    if (source === 'client') {
      if (identity.kind !== 'admin') {
        throw new ForbiddenException('Only admins can call clients.');
      }
      const { data } = await this.db
        .from('intake_forms')
        .select('id, contact_name, contact_phone')
        .eq('id', id)
        .maybeSingle();
      const row = data as Row | null;
      if (!row) throw new NotFoundException('Contact not found.');
      if (!row.contact_phone) {
        throw new BadRequestException('This client has no phone number.');
      }
      return {
        phone: row.contact_phone,
        name: row.contact_name ?? null,
        refType: 'client',
        refId: id,
      };
    }
    if (source === 'lead') {
      const { data } = await this.db
        .from('demo_requests')
        .select('id, name, phone, claimed_by_affiliate_id')
        .eq('id', id)
        .maybeSingle();
      const row = data as Row | null;
      if (!row) throw new NotFoundException('Contact not found.');
      const allowed =
        identity.kind === 'admin' ||
        identity.isManager ||
        (!!identity.affiliateId &&
          row.claimed_by_affiliate_id === identity.affiliateId);
      if (!allowed) {
        throw new ForbiddenException('Claim this lead before calling.');
      }
      return {
        phone: row.phone,
        name: row.name ?? null,
        refType: 'lead',
        refId: id,
      };
    }
    throw new BadRequestException('Unknown contact type.');
  }

  async startOutbound(
    identity: CallIdentity,
    input: { source?: unknown; id?: unknown },
  ) {
    this.baseUrl(); // fails early when calling is not configured
    const staff = await this.ensureStaff(identity);
    if (!staff.calling_enabled) {
      throw new ForbiddenException(
        'Calling is not turned on for your account. Ask an admin.',
      );
    }
    if (!staff.mobile_e164 || !staff.mobile_verified_at) {
      throw new BadRequestException({
        code: 'MOBILE_NOT_VERIFIED',
        message: 'Add and verify your cell phone before calling.',
      });
    }

    const target = await this.resolveTarget(identity, input.source, input.id);
    const phone = normalizePhone(target.phone);
    if (!phone) {
      throw new BadRequestException('That phone number is not valid.');
    }
    const settings = await this.getSettings();
    if (!isAllowedDestination(phone, settings.allowed_country_codes)) {
      throw new ForbiddenException({
        code: 'DESTINATION_NOT_ALLOWED',
        message: 'Calls to that region are not allowed.',
      });
    }

    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count: mine } = await this.db
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('staff_user_id', identity.userId)
      .eq('direction', 'outbound')
      .gte('created_at', hourAgo);
    if ((mine ?? 0) >= settings.max_calls_per_hour) {
      throw new HttpException(
        'You have reached the hourly calling limit.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const { count: toNumber } = await this.db
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('client_phone', phone)
      .eq('direction', 'outbound')
      .gte('created_at', hourAgo);
    if ((toNumber ?? 0) >= MAX_CALLS_PER_NUMBER_PER_HOUR) {
      throw new HttpException(
        'That number has been called several times this hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // A call whose callbacks never arrived must not block the staff member forever.
    await this.db
      .from('call_logs')
      .update({ status: 'failed', ended_at: new Date().toISOString() })
      .eq('staff_user_id', identity.userId)
      .eq('direction', 'outbound')
      .in('status', PRE_CONNECT_STATUSES)
      .lt(
        'created_at',
        new Date(Date.now() - STALE_SETUP_SECONDS * 1000).toISOString(),
      );

    const { data: log, error } = await this.db
      .from('call_logs')
      .insert({
        direction: 'outbound',
        staff_user_id: identity.userId,
        staff_name: identity.name,
        client_phone: phone,
        client_name: target.name,
        ref_type: target.refType,
        ref_id: target.refId,
        status: 'initiated',
      })
      .select('id, status')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictException({
          code: 'CALL_IN_PROGRESS',
          message: 'You already have a call being set up.',
        });
      }
      this.fail('Creating call record failed', error.message);
    }
    const logId = (log as Row).id as string;

    try {
      const call = await this.twilioService.createCall({
        to: staff.mobile_e164,
        url: this.hookUrl('staff-gather', { logId }),
        statusCallback: this.hookUrl('staff-status', { logId }),
        timeoutSeconds: STAFF_RING_SECONDS,
      });
      await this.patchLog(logId, { staff_call_sid: call.sid });
    } catch (e) {
      this.logger.error(`Twilio call failed: ${(e as Error).message}`);
      await this.patchLog(logId, {
        status: 'failed',
        ended_at: new Date().toISOString(),
      });
      throw new HttpException(
        'We could not start the call. Please try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return { id: logId, status: 'initiated' as CallStatus };
  }

  // ── call records ──────────────────────────────────────────────

  private async patchLog(id: string, patch: Row): Promise<void> {
    const { error } = await this.db
      .from('call_logs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) this.logger.error(`Call log update failed: ${error.message}`);
  }

  private async loadLog(id: unknown): Promise<Row | null> {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
    const { data } = await this.db
      .from('call_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return (data as Row | null) ?? null;
  }

  /** Moves a call forward (never backward) and stamps end time / duration. */
  private async applyStatus(
    log: Row,
    next: CallStatus,
    extra: {
      durationSeconds?: number;
      answered?: boolean;
      clientSid?: string;
    } = {},
  ): Promise<void> {
    const status = advanceStatus(log.status, next);
    const patch: Row = {};
    if (status !== log.status) patch.status = status;
    if (isTerminal(status) && !log.ended_at) {
      patch.ended_at = new Date().toISOString();
    }
    if (extra.answered && !log.answered_at) {
      patch.answered_at = new Date().toISOString();
    }
    if (
      extra.durationSeconds !== undefined &&
      Number.isFinite(extra.durationSeconds) &&
      extra.durationSeconds >= (log.duration_seconds ?? 0)
    ) {
      patch.duration_seconds = Math.round(extra.durationSeconds);
    }
    if (extra.clientSid && !log.client_call_sid) {
      patch.client_call_sid = extra.clientSid;
    }
    if (Object.keys(patch).length) await this.patchLog(log.id, patch);
  }

  private visibleToStaff(identity: CallIdentity, log: Row): boolean {
    if (identity.kind === 'admin') return true;
    return (
      log.staff_user_id === identity.userId ||
      (log.direction === 'inbound' && !log.staff_user_id)
    );
  }

  async history(identity: CallIdentity, limit = 50) {
    const capped = Math.min(Math.max(Math.trunc(limit) || 50, 1), 200);
    let query = this.db
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(capped);
    if (identity.kind !== 'admin') {
      query = query.or(
        `staff_user_id.eq.${identity.userId},and(direction.eq.inbound,staff_user_id.is.null)`,
      );
    }
    const { data, error } = await query;
    if (error) this.fail('Call history failed', error.message);
    return { calls: (data ?? []) as Row[] };
  }

  async getCall(identity: CallIdentity, id: string) {
    const log = await this.loadLog(id);
    if (!log || !this.visibleToStaff(identity, log)) {
      throw new NotFoundException('Call not found.');
    }
    return log;
  }

  async saveNotes(
    identity: CallIdentity,
    id: string,
    input: { outcome?: unknown; notes?: unknown },
  ) {
    const log = await this.loadLog(id);
    if (
      !log ||
      !(identity.kind === 'admin' || log.staff_user_id === identity.userId)
    ) {
      throw new NotFoundException('Call not found.');
    }
    const patch: Row = {};
    if (input.outcome !== undefined) {
      if (
        input.outcome !== null &&
        !(
          typeof input.outcome === 'string' &&
          (OUTCOMES as readonly string[]).includes(input.outcome)
        )
      ) {
        throw new BadRequestException('Pick one of the listed outcomes.');
      }
      patch.outcome = input.outcome;
    }
    if (input.notes !== undefined) {
      if (input.notes !== null && typeof input.notes !== 'string') {
        throw new BadRequestException('Notes must be text.');
      }
      const notes = input.notes;
      if (notes && notes.length > 2000) {
        throw new BadRequestException('Notes can be up to 2000 characters.');
      }
      patch.notes = notes;
    }
    await this.patchLog(id, patch);
    return this.getCall(identity, id);
  }

  // ── Twilio webhooks: outbound ─────────────────────────────────

  /** Staff phone answered: ask them to confirm. The client is not dialled yet. */
  async staffGather(logId: string): Promise<string> {
    const log = await this.loadLog(logId);
    if (!log || log.direction !== 'outbound' || isTerminal(log.status)) {
      return this.hangupTwiml();
    }
    await this.applyStatus(log, 'staff_ringing');
    return this.twiml((r) => {
      const gather = r.gather({
        numDigits: 1,
        timeout: 8,
        method: 'POST',
        action: this.hookUrl('staff-confirm', { logId: log.id }),
      });
      gather.say('EventEcos call. Press 1 to connect.');
      r.say('We did not get a response. Goodbye.');
      r.hangup();
    });
  }

  /** Only a staff member pressing 1 leads to the client being dialled, and the number comes from the saved record. */
  async staffConfirm(
    logId: string,
    digits: string | undefined,
  ): Promise<string> {
    const log = await this.loadLog(logId);
    if (!log || log.direction !== 'outbound') return this.hangupTwiml();

    if (digits !== '1') {
      await this.applyStatus(log, 'staff_declined');
      return this.hangupTwiml('Okay. Goodbye.');
    }
    const settings = await this.getSettings();
    if (
      !isAllowedDestination(log.client_phone, settings.allowed_country_codes)
    ) {
      await this.applyStatus(log, 'failed');
      return this.hangupTwiml('That number is not allowed. Goodbye.');
    }

    // Only the first confirmation of a call still being set up may dial.
    const { data: claimed } = await this.db
      .from('call_logs')
      .update({
        status: 'client_ringing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', log.id)
      .in('status', ['initiated', 'staff_ringing'])
      .select('id');
    if (!claimed || (claimed as Row[]).length === 0) {
      return this.hangupTwiml();
    }

    const callerId = this.twilioService.getBusinessNumber()!;
    return this.twiml((r) => {
      r.say('Connecting you now.');
      const dial = r.dial({
        callerId,
        timeout: CLIENT_RING_SECONDS,
        answerOnBridge: true,
        method: 'POST',
        action: this.hookUrl('dial-result', { logId: log.id }),
      });
      dial.number(
        {
          statusCallback: this.hookUrl('client-status', { logId: log.id }),
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['answered', 'completed'],
        } as any,
        log.client_phone,
      );
    });
  }

  /** Staff leg status: covers "never answered" and "hung up without confirming". */
  async staffStatus(
    logId: string,
    body: Record<string, string>,
  ): Promise<void> {
    const log = await this.loadLog(logId);
    if (!log) return;
    const twilioStatus = body.CallStatus;
    const setup = log.status === 'initiated' || log.status === 'staff_ringing';
    if (twilioStatus === 'in-progress') {
      await this.applyStatus(log, 'staff_ringing');
    } else if (
      ['no-answer', 'busy', 'failed', 'canceled'].includes(twilioStatus) &&
      setup
    ) {
      await this.applyStatus(log, 'staff_no_answer');
    } else if (twilioStatus === 'completed') {
      if (setup) {
        await this.applyStatus(log, 'staff_declined');
      } else if (!isTerminal(log.status)) {
        // The staff phone hung up while the client leg was still unresolved.
        await this.applyStatus(
          log,
          log.answered_at ? 'completed' : 'canceled',
          {
            durationSeconds: Number(body.CallDuration) || undefined,
          },
        );
      }
    }
  }

  async clientStatus(
    logId: string,
    body: Record<string, string>,
  ): Promise<void> {
    const log = await this.loadLog(logId);
    if (!log) return;
    const next = clientLegStatus(body.CallStatus);
    if (!next) return;
    await this.applyStatus(log, next, {
      answered:
        body.CallStatus === 'in-progress' || body.CallStatus === 'answered',
      clientSid: body.CallSid,
      durationSeconds:
        body.CallStatus === 'completed' ? Number(body.CallDuration) : undefined,
    });
  }

  async dialResult(
    logId: string,
    body: Record<string, string>,
  ): Promise<string> {
    const log = await this.loadLog(logId);
    if (log) {
      const next = clientLegStatus(body.DialCallStatus);
      if (next) {
        await this.applyStatus(log, next, {
          durationSeconds:
            body.DialCallStatus === 'completed'
              ? Number(body.DialCallDuration)
              : undefined,
        });
      }
    }
    return body.DialCallStatus === 'completed'
      ? this.hangupTwiml()
      : this.hangupTwiml('The client did not answer. Goodbye.');
  }

  // ── Twilio webhooks: inbound ──────────────────────────────────

  private voicemailTwiml(logId: string, greeting: string): string {
    return this.twiml((r) => {
      r.say(greeting);
      r.record({
        maxLength: 120,
        playBeep: true,
        finishOnKey: '#',
        action: this.hookUrl('voicemail-done', { logId }),
        recordingStatusCallback: this.hookUrl('voicemail-recording', { logId }),
        recordingStatusCallbackMethod: 'POST',
      });
      r.say('Goodbye.');
      r.hangup();
    });
  }

  async incoming(body: Record<string, string>): Promise<string> {
    const caller = body.From || 'unknown';
    const sid = body.CallSid;

    let log: Row | null = null;
    const { data: inserted, error } = await this.db
      .from('call_logs')
      .insert({
        direction: 'inbound',
        client_phone: normalizePhone(caller) ?? caller,
        status: 'ringing',
        client_call_sid: sid,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code !== '23505')
        this.fail('Inbound log failed', error.message);
      const { data: existing } = await this.db
        .from('call_logs')
        .select('*')
        .eq('client_call_sid', sid)
        .maybeSingle();
      log = existing as Row | null;
    } else {
      log = inserted as Row;
    }
    if (!log) return this.hangupTwiml();

    const settings = await this.getSettings();
    const open = isOpenNow(new Date(), settings.business_hours);

    let recipients: Row[] = [];
    if (open) {
      const { data } = await this.db
        .from('call_staff')
        .select('user_id, mobile_e164, display_name')
        .eq('calling_enabled', true)
        .eq('receives_inbound', true)
        .not('mobile_verified_at', 'is', null);
      recipients = ((data ?? []) as Row[])
        .filter((s) => !!s.mobile_e164)
        .slice(0, MAX_INBOUND_RINGS);
    }

    if (!open || recipients.length === 0) {
      await this.applyStatus(log, 'voicemail');
      return this.voicemailTwiml(log.id, settings.voicemail_greeting);
    }

    const callerId = this.twilioService.getBusinessNumber() ?? body.To;
    return this.twiml((r) => {
      const dial = r.dial({
        callerId,
        timeout: INBOUND_RING_SECONDS,
        answerOnBridge: true,
        method: 'POST',
        action: this.hookUrl('incoming-result', { logId: log.id }),
      });
      for (const s of recipients) {
        dial.number(
          {
            url: this.hookUrl('incoming-screen', {
              logId: log.id,
              staffId: s.user_id,
            }),
            method: 'POST',
          } as any,
          s.mobile_e164,
        );
      }
    });
  }

  /** Runs on the staff member's leg: personal voicemail cannot press 1, so it can never take the call. */
  async incomingScreen(
    logId: string,
    staffId: string,
    digits: string | undefined,
  ): Promise<string> {
    const log = await this.loadLog(logId);
    if (!log || log.direction !== 'inbound' || !UUID_RE.test(staffId ?? '')) {
      return this.hangupTwiml();
    }

    if (digits === undefined) {
      return this.twiml((r) => {
        const gather = r.gather({
          numDigits: 1,
          timeout: 6,
          method: 'POST',
          action: this.hookUrl('incoming-screen', { logId, staffId }),
        });
        gather.say('EventEcos incoming client call. Press 1 to accept.');
        r.hangup();
      });
    }
    if (digits !== '1') return this.hangupTwiml();

    const { data: won } = await this.db
      .from('call_logs')
      .update({
        staff_user_id: staffId,
        status: 'in_progress',
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', logId)
      .is('staff_user_id', null)
      .select('id');
    if (!won || (won as Row[]).length === 0) {
      return this.hangupTwiml('Another teammate already took this call.');
    }
    const { data: staff } = await this.db
      .from('call_staff')
      .select('display_name')
      .eq('user_id', staffId)
      .maybeSingle();
    await this.patchLog(logId, {
      staff_name: (staff as Row | null)?.display_name ?? null,
    });
    return this.twiml(() => undefined);
  }

  async incomingResult(
    logId: string,
    body: Record<string, string>,
  ): Promise<string> {
    const log = await this.loadLog(logId);
    if (!log) return this.hangupTwiml();
    if (body.DialCallStatus === 'completed' && log.staff_user_id) {
      await this.applyStatus(log, 'completed', {
        durationSeconds: Number(body.DialCallDuration),
      });
      return this.hangupTwiml();
    }
    const settings = await this.getSettings();
    await this.applyStatus(log, 'voicemail');
    return this.voicemailTwiml(logId, settings.voicemail_greeting);
  }

  voicemailDone(): string {
    return this.hangupTwiml('Thank you. Goodbye.');
  }

  async voicemailRecording(logId: string, body: Record<string, string>) {
    const url = body.RecordingUrl;
    if (
      !body.RecordingSid ||
      typeof url !== 'string' ||
      !url.startsWith('https://api.twilio.com/')
    ) {
      return;
    }
    const log = await this.loadLog(logId);
    const { error } = await this.db.from('call_voicemails').insert({
      call_log_id: log?.id ?? null,
      from_number: log?.client_phone ?? body.From ?? null,
      recording_sid: body.RecordingSid,
      recording_url: url,
      duration_seconds: Number(body.RecordingDuration) || null,
    });
    if (error && error.code !== '23505') {
      this.logger.error(`Voicemail save failed: ${error.message}`);
    }
  }

  // ── voicemail inbox ───────────────────────────────────────────

  private async assertVoicemailAccess(identity: CallIdentity) {
    if (identity.kind === 'admin') return;
    const staff = await this.ensureStaff(identity);
    if (!staff.calling_enabled) throw new ForbiddenException('No access.');
  }

  async listVoicemails(identity: CallIdentity) {
    await this.assertVoicemailAccess(identity);
    const { data, error } = await this.db
      .from('call_voicemails')
      .select('id, from_number, duration_seconds, listened_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) this.fail('Voicemail list failed', error.message);
    return { voicemails: (data ?? []) as Row[] };
  }

  async voicemailAudio(identity: CallIdentity, id: string): Promise<Buffer> {
    await this.assertVoicemailAccess(identity);
    if (!UUID_RE.test(id)) throw new NotFoundException('Voicemail not found.');
    const { data } = await this.db
      .from('call_voicemails')
      .select('id, recording_url, listened_at')
      .eq('id', id)
      .maybeSingle();
    const row = data as Row | null;
    if (!row) throw new NotFoundException('Voicemail not found.');
    let audio: Buffer;
    try {
      audio = await this.twilioService.fetchRecordingAudio(row.recording_url);
    } catch (e) {
      this.logger.error(`Voicemail audio failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('The recording is not available.');
    }
    if (!row.listened_at) {
      await this.db
        .from('call_voicemails')
        .update({ listened_at: new Date().toISOString() })
        .eq('id', id);
    }
    return audio;
  }
}
