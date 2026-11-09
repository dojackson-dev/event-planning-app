import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from '../messaging/twilio.service';

/** Rejects any webhook that Twilio did not sign for this exact public URL. */
@Injectable()
export class TwilioSignatureGuard implements CanActivate {
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
      throw new ForbiddenException('Invalid signature');
    }
    return true;
  }
}
