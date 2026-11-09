import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from '../messaging/twilio.service';

/** Rejects any webhook that Twilio did not sign for this exact public URL. */
@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  private readonly logger = new Logger(TwilioSignatureGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly twilioService: TwilioService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const base = this.config.get<string>('API_PUBLIC_URL');
    if (!base) throw new ServiceUnavailableException('Calling is not set up.');
    const request = context.switchToHttp().getRequest();
    const url = `${base.replace(/\/+$/, '')}${request.originalUrl}`;
    const signature = request.headers['x-twilio-signature'] as
      | string
      | undefined;
    if (
      !this.twilioService.validateWebhook(signature, url, request.body ?? {})
    ) {
      // The address is not secret; logging it makes a wrong API_PUBLIC_URL easy to spot.
      this.logger.warn(
        `Rejected Twilio webhook: signature did not match for ${url}`,
      );
      throw new ForbiddenException('Invalid signature');
    }
    return true;
  }
}
