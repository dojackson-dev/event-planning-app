import { Injectable, Logger } from '@nestjs/common';

/**
 * SMS Service - Placeholder for phone verification
 * TODO: Install twilio and implement
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly isConfigured = false; // Set to true when Twilio credentials added
  
  // In-memory OTP storage for testing (use Redis in production)
  private otpStore = new Map<string, { code: string; expiresAt: Date }>();

  /**
   * Send SMS OTP for phone verification
   */
  async sendVerificationCode(phoneNumber: string, userId: string): Promise<void> {
    const otp = this.generateOTP();

    if (!this.isConfigured) {
      this.logger.warn(`SMS not configured - Mock OTP for ${phoneNumber}: ${otp}`);
      // Store for testing
      this.otpStore.set(userId, {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });
      return;
    }

    // TODO: Implement Twilio
    // const twilio = require('twilio');
    // const client = twilio(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN
    // );
    // 
    // await client.messages.create({
    //   body: `Your verification code is: ${otp}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });

    // Store OTP for verification
    this.otpStore.set(userId, {
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
  }

  /**
   * Verify OTP code
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const stored = this.otpStore.get(userId);

    if (!stored) {
      this.logger.warn(`No OTP found for user: ${userId}`);
      return false;
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(userId);
      this.logger.warn(`OTP expired for user: ${userId}`);
      return false;
    }

    if (stored.code !== code) {
      this.logger.warn(`Invalid OTP for user: ${userId}`);
      return false;
    }

    // Valid - remove from store
    this.otpStore.delete(userId);
    return true;
  }

  /**
   * Send SMS notification (for client communications)
   */
  async sendNotification(phoneNumber: string, message: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`SMS not configured - Mock notification to ${phoneNumber}: ${message}`);
      return;
    }

    // TODO: Implement Twilio
    // const twilio = require('twilio');
    // const client = twilio(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN
    // );
    // 
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });
  }

  /**
   * Get current OTP for testing (remove in production)
   */
  getTestOTP(userId: string): string | null {
    const stored = this.otpStore.get(userId);
    return stored?.code || null;
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
