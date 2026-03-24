import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../messaging/twilio.service';
import { randomBytes, createHash } from 'crypto';

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

  // In-memory stores – swap for Redis in production
  private readonly otpStore = new Map<string, OtpRecord>();
  private readonly sessionStore = new Map<string, ClientSession>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly twilioService: TwilioService,
  ) {}

  /**
   * Request an OTP for the given phone number.
   * Matches against the users table OR submitted intake forms (by phone + optional name).
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

    // Prefer admin client (bypasses RLS); fall back to anon if service key not configured
    let supabase: any;
    try {
      supabase = this.supabaseService.getAdminClient();
    } catch {
      supabase = this.supabaseService.getClient();
    }

    // Check existing users table first
    const { data: clientUser, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone_number, role')
      .eq('phone_number', normalized)
      .maybeSingle();

    if (error) {
      this.logger.error('DB error looking up phone in users', error);
    }

    let clientFound = !!clientUser;

    // If not in users, check intake_forms by phone variants (+ name match if provided)
    if (!clientFound) {
      const phoneVariants = this.buildPhoneVariants(normalized);
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
        if (name) {
          // Verify at least one intake form name matches (case-insensitive, first-name match)
          const nameLower = name.toLowerCase().trim();
          const inputFirst = nameLower.split(/\s+/)[0];
          clientFound = allIntakeForms.some((f: any) => {
            const intakeName = (f.contact_name || '').toLowerCase().trim();
            const intakeFirst = intakeName.split(/\s+/)[0];
            return (
              intakeName === nameLower ||
              intakeName.includes(nameLower) ||
              nameLower.includes(intakeName) ||
              intakeFirst === inputFirst
            );
          });
        } else {
          clientFound = true;
        }
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
   * Handles clients found in users table OR intake_forms only (auto-derives identity from intake).
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

    const { data: clientUser } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone_number')
      .eq('phone_number', normalized)
      .maybeSingle();

    let clientId: string;
    let firstName: string;
    let lastName: string;

    if (clientUser) {
      clientId = clientUser.id;
      firstName = clientUser.first_name || '';
      lastName = clientUser.last_name || '';
    } else {
      // No users entry – derive identity from the name entered at login or intake forms
      const enteredName = (record.name || name || '').trim();
      if (enteredName) {
        const parts = enteredName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      } else {
        // Last-resort: pull name from a matching intake form
        const phoneVariants = this.buildPhoneVariants(normalized);
        const intakeResults = await Promise.all(
          phoneVariants.map(p =>
            supabase
              .from('intake_forms')
              .select('contact_name')
              .eq('contact_phone', p)
              .limit(1),
          ),
        );
        const allForms = intakeResults.flatMap((r: any) => r.data || []);
        const intakeName = allForms[0]?.contact_name || '';
        const parts = intakeName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
      // Generate a stable, UUID-format client ID derived from the phone number
      clientId = this.generatePhoneClientId(normalized);
    }

    // Issue a session token – 30-day expiry for persistent login
    const token = randomBytes(32).toString('hex');
    const session: ClientSession = {
      clientId,
      phone: normalized,
      firstName,
      lastName,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
    this.sessionStore.set(token, session);

    this.logger.log(`Client session created for ${normalized}`);

    const { expiresAt, ...clientInfo } = session;
    return { token, client: clientInfo };
  }

  /**
   * Validate a session token and return the client session.
   */
  validateSession(token: string): ClientSession {
    const session = this.sessionStore.get(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    if (new Date() > session.expiresAt) {
      this.sessionStore.delete(token);
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    return session;
  }

  /**
   * Invalidate a session token (logout).
   */
  revokeSession(token: string): void {
    this.sessionStore.delete(token);
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
   * Generate a stable, UUID-format ID derived from a phone number.
   * Used for intake-form-only clients who have no auth.users entry.
   * Queries against booking.user_id won't match (intentional); phone-based queries handle lookup.
   */
  private generatePhoneClientId(phone: string): string {
    const hash = createHash('sha256').update(`dovenue:client:${phone}`).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-b${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }
}
