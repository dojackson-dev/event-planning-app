import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../messaging/twilio.service';
import { randomBytes, createHash, createHmac } from 'crypto';

interface OtpRecord {
  code: string;
  phone: string;
  expiresAt: Date;
  agreedToSms: boolean;
  agreedToTerms: boolean;
  name?: string;
}

export interface ClientSession {
  clientId: string;
  phone: string;
  firstName: string;
  lastName: string;
  expiresAt: Date;
}

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  // In-memory OTP store (short-lived, in-memory is fine)
  private readonly otpStore = new Map<string, OtpRecord>();

  // Session secret — self-validating HMAC tokens survive backend restarts
  private readonly sessionSecret =
    process.env.CLIENT_SESSION_SECRET ||
    createHash('sha256').update('dovenue-client-sessions-devkey').digest('hex');

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly twilioService: TwilioService,
  ) {}

  /**
   * Request an OTP for the given phone number.
   * Matches against: users table, intake_forms, or booking contact_phone.
   */
  async requestOtp(
    phone: string,
    agreedToSms: boolean,
    agreedToTerms: boolean,
    name?: string,
  ): Promise<{ message: string; devOtp?: string }> {
    if (!agreedToSms || !agreedToTerms) {
      throw new BadRequestException(
        'You must agree to SMS communications and our Terms of Service / Privacy Policy.',
      );
    }

    const normalized = this.normalizePhone(phone);
    const phoneVariants = this.buildPhoneVariants(normalized);

    // Prefer admin client (bypasses RLS); fall back to anon if service key not configured
    let supabase: any;
    try {
      supabase = this.supabaseService.getAdminClient();
    } catch {
      supabase = this.supabaseService.getClient();
    }

    // 1. Check users table with all phone variants
    let clientFound = false;
    const userResults = await Promise.all(
      phoneVariants.map(p =>
        supabase
          .from('users')
          .select('id')
          .eq('phone_number', p)
          .limit(1),
      ),
    );
    if (userResults.some((r: any) => r.data?.length > 0)) {
      clientFound = true;
    }

    // 2. Check intake_forms by phone variants (+ optional name match)
    if (!clientFound) {
      const intakeResults = await Promise.all(
        phoneVariants.map(p =>
          supabase
            .from('intake_forms')
            .select('id, contact_name, contact_phone')
            .eq('contact_phone', p)
            .limit(10),
        ),
      );
      const allIntakeForms = intakeResults.flatMap((r: any) => r.data || []);
      if (allIntakeForms.length > 0) {
        clientFound = name ? this.nameMatches(name, allIntakeForms.map((f: any) => f.contact_name)) : true;
      }
    }

    // 3. Check booking.contact_phone by phone variants (+ optional name match)
    if (!clientFound) {
      const bookingResults = await Promise.all(
        phoneVariants.map(p =>
          supabase
            .from('booking')
            .select('id, contact_name, contact_phone')
            .eq('contact_phone', p)
            .limit(10),
        ),
      );
      const allBookings = bookingResults.flatMap((r: any) => r.data || []);
      if (allBookings.length > 0) {
        clientFound = name ? this.nameMatches(name, allBookings.map((b: any) => b.contact_name)) : true;
      }
    }

    // 4. Check vendor_booking_requests.client_phone (submitted via vendor public booking form)
    if (!clientFound) {
      const vendorRequestResults = await Promise.all(
        phoneVariants.map(p =>
          supabase
            .from('vendor_booking_requests')
            .select('id, client_name, client_phone')
            .eq('client_phone', p)
            .limit(10),
        ),
      );
      const allVendorRequests = vendorRequestResults.flatMap((r: any) => r.data || []);
      if (allVendorRequests.length > 0) {
        clientFound = name ? this.nameMatches(name, allVendorRequests.map((r: any) => r.client_name)) : true;
      }
    }

    if (!clientFound) {
      this.logger.warn(`OTP requested for unrecognized phone: ${normalized}`);
      return { message: 'If this number is on file, you will receive a verification code shortly.' };
    }

    const otp = this.generateOtp();
    this.otpStore.set(normalized, {
      code: otp,
      phone: normalized,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      agreedToSms,
      agreedToTerms,
      name,
    });

    this.logger.log(`OTP generated for ${normalized}`);

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      this.logger.warn(`[DEV] OTP for ${normalized}: ${otp}`);
      return {
        message: 'Verification code sent.',
        devOtp: otp,
      };
    }

    await this.twilioService.sendSMS(
      normalized,
      `Your DoVenue Suites verification code is: ${otp}. Valid for 10 minutes.`,
    );

    return { message: 'Verification code sent.' };
  }

  /**
   * Verify an OTP and return a session token.
   * Handles clients found in users table, intake_forms, or booking.contact_phone.
   */
  async verifyOtp(
    phone: string,
    code: string,
    name?: string,
  ): Promise<{ token: string; client: Omit<ClientSession, 'expiresAt'> }> {
    const normalized = this.normalizePhone(phone);
    const record = this.otpStore.get(normalized);

    if (!record) {
      throw new UnauthorizedException('No verification code was requested for this number.');
    }

    if (new Date() > record.expiresAt) {
      this.otpStore.delete(normalized);
      throw new UnauthorizedException('Verification code has expired. Please request a new one.');
    }

    if (record.code !== code.trim()) {
      throw new UnauthorizedException('Incorrect verification code.');
    }

    // Valid – consume OTP
    this.otpStore.delete(normalized);

    // Look up the client — prefer admin client, fall back to anon
    let supabase: any;
    try {
      supabase = this.supabaseService.getAdminClient();
    } catch {
      supabase = this.supabaseService.getClient();
    }

    const phoneVariants = this.buildPhoneVariants(normalized);

    // 1. Look up in users table using all phone variants
    let clientId: string | null = null;
    let firstName = '';
    let lastName = '';

    for (const variant of phoneVariants) {
      const { data: u } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('phone_number', variant)
        .maybeSingle();
      if (u) {
        clientId = u.id;
        firstName = u.first_name || '';
        lastName = u.last_name || '';
        break;
      }
    }

    if (!clientId) {
      // 2. Derive name from: login input → intake forms → bookings
      const enteredName = (record.name || name || '').trim();
      if (enteredName) {
        const parts = enteredName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      } else {
        // Try intake forms first
        const intakeResults = await Promise.all(
          phoneVariants.map(p =>
            supabase.from('intake_forms').select('contact_name').eq('contact_phone', p).limit(1),
          ),
        );
        const intakeName = intakeResults.flatMap((r: any) => r.data || [])[0]?.contact_name || '';
        if (intakeName) {
          const parts = intakeName.split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        } else {
          // Try bookings
          const bookingResults = await Promise.all(
            phoneVariants.map(p =>
              supabase.from('booking').select('contact_name').eq('contact_phone', p).limit(1),
            ),
          );
          const bookingName = bookingResults.flatMap((r: any) => r.data || [])[0]?.contact_name || '';
          if (bookingName) {
            const parts = bookingName.split(/\s+/);
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          } else {
            // Try vendor_booking_requests (submitted via vendor public booking form)
            const vendorRequestResults = await Promise.all(
              phoneVariants.map(p =>
                supabase.from('vendor_booking_requests').select('client_name').eq('client_phone', p).limit(1),
              ),
            );
            const vendorRequestName = vendorRequestResults.flatMap((r: any) => r.data || [])[0]?.client_name || '';
            const parts = vendorRequestName.split(/\s+/);
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          }
        }
      }
      // Generate a stable, UUID-format client ID derived from the phone number
      clientId = this.generatePhoneClientId(normalized);
    }

    // Issue a session token – 30-day expiry for persistent login
    const sessionData = {
      clientId,
      phone: normalized,
      firstName,
      lastName,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    const payload = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
    const sig = createHmac('sha256', this.sessionSecret).update(payload).digest('base64url');
    const token = `${payload}.${sig}`;

    this.logger.log(`Client session created for ${normalized}`);

    const { expiresAt, ...clientInfo } = sessionData as any;
    return { token, client: { ...clientInfo } };
  }

  /**
   * Validate a session token and return the client session.
   */
  validateSession(token: string): ClientSession {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) throw new UnauthorizedException('Invalid session token.');

    const payload = token.substring(0, dotIndex);
    const sig = token.substring(dotIndex + 1);
    const expectedSig = createHmac('sha256', this.sessionSecret).update(payload).digest('base64url');

    if (sig !== expectedSig) throw new UnauthorizedException('Invalid session token.');

    let session: ClientSession;
    try {
      session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch {
      throw new UnauthorizedException('Invalid session token.');
    }

    if (new Date() > new Date(session.expiresAt)) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    return session;
  }

  /**
   * Logout is handled client-side by clearing localStorage.
   * HMAC tokens cannot be individually revoked without a denylist.
   */
  revokeSession(_token: string): void {
    // No-op: token expiry is enforced via the embedded expiresAt claim
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private normalizePhone(phone: string): string {
    // Strip all non-digit characters, then ensure E.164 format
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
  }

  private buildPhoneVariants(phone: string): string[] {
    const digits = phone.replace(/\D/g, '');
    const last10 = digits.slice(-10);
    return [...new Set([phone, last10, `1${last10}`, `+1${last10}`])].filter(Boolean);
  }

  /**
   * Fuzzy name match: returns true if the login-entered name roughly matches
   * any candidate name (first-name match, full-name substring, etc.).
   */
  private nameMatches(input: string, candidates: string[]): boolean {
    const inputLower = input.toLowerCase().trim();
    const inputFirst = inputLower.split(/\s+/)[0];
    return candidates.some(candidate => {
      const c = (candidate || '').toLowerCase().trim();
      const cFirst = c.split(/\s+/)[0];
      return (
        c === inputLower ||
        c.includes(inputLower) ||
        inputLower.includes(c) ||
        cFirst === inputFirst
      );
    });
  }

  /**
   * Generate a stable, UUID-format ID derived from a phone number.
   * Used for intake-form-only clients who have no auth.users entry.
   * Queries against booking.user_id won't match (intentional); phone-based queries handle lookup.
   */
  private generatePhoneClientId(phone: string): string {
    const hash = createHash('sha256').update(`dovenue:client:${phone}`).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-b${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }
}
