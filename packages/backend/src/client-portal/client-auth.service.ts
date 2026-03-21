import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../messaging/twilio.service';
import { randomBytes } from 'crypto';

interface OtpRecord {
  code: string;
  phone: string;
  expiresAt: Date;
  agreedToSms: boolean;
  agreedToTerms: boolean;
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
   * The phone must belong to a client (role = 'customer') in the users table.
   */
  async requestOtp(
    phone: string,
    agreedToSms: boolean,
    agreedToTerms: boolean,
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

    const { data: clientUser, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone_number, role')
      .eq('phone_number', normalized)
      .maybeSingle();

    if (error) {
      this.logger.error('DB error looking up phone', error);
      // Return generic message – don't leak internal errors
      return { message: 'If this number is on file, you will receive a verification code shortly.' };
    }

    if (!clientUser) {
      // Don't leak whether the phone exists – still say we sent it
      this.logger.warn(`OTP requested for unknown phone: ${normalized}`);
      return { message: 'If this number is on file, you will receive a verification code shortly.' };
    }

    const otp = this.generateOtp();
    this.otpStore.set(normalized, {
      code: otp,
      phone: normalized,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      agreedToSms,
      agreedToTerms,
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
   */
  async verifyOtp(
    phone: string,
    code: string,
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

    const { data: clientUser, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone_number')
      .eq('phone_number', normalized)
      .maybeSingle();

    if (error || !clientUser) {
      throw new UnauthorizedException('Client account not found.');
    }

    // Issue a session token (random, stored server-side)
    const token = randomBytes(32).toString('hex');
    const session: ClientSession = {
      clientId: clientUser.id,
      phone: normalized,
      firstName: clientUser.first_name,
      lastName: clientUser.last_name,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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
}
