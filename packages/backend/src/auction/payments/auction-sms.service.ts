import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from '../../messaging/twilio.service';
import { safeError } from './auction-payments.helpers';

export interface TextableBidder {
  phone_e164: string | null;
  phone_verified_at: string | null;
  sms_consent?: boolean | null;
}

/** Twilio wrapper for auction texts: only to a verified phone whose owner consented. Never throws. */
@Injectable()
export class AuctionSmsService {
  private readonly logger = new Logger(AuctionSmsService.name);

  constructor(private readonly twilio: TwilioService) {}

  canText(bidder: TextableBidder | null | undefined): boolean {
    return Boolean(
      bidder?.phone_e164 && bidder.phone_verified_at && bidder.sms_consent,
    );
  }

  async send(bidder: TextableBidder, body: string): Promise<boolean> {
    if (!this.canText(bidder)) return false;
    try {
      await this.twilio.sendSMS(bidder.phone_e164!, body);
      return true;
    } catch (err) {
      this.logger.warn(`Auction SMS failed: ${safeError(err)}`);
      return false;
    }
  }
}
