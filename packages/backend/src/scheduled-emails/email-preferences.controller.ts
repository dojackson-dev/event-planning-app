import { Controller, Get, Query, Res } from '@nestjs/common';
import { ScheduledEmailsService } from './scheduled-emails.service';

@Controller('email-preferences')
export class EmailPreferencesController {
  constructor(
    private readonly scheduledEmailsService: ScheduledEmailsService,
  ) {}

  /**
   * One-click unsubscribe link included in every automated email footer.
   * `uid`/`sig` form a signed, non-guessable token (HMAC of the user id) so
   * this public GET endpoint can't be used to unsubscribe other users.
   */
  @Get('unsubscribe')
  async unsubscribe(
    @Query('uid') uid: string,
    @Query('sig') sig: string,
    @Res() res: any,
  ) {
    const ok =
      uid && sig
        ? await this.scheduledEmailsService.unsubscribeUser(uid, sig)
        : false;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(ok ? 200 : 400).send(`
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /><title>EventEcos</title></head>
        <body style="font-family:Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#374151;">
          <h2>${ok ? "You've been unsubscribed" : 'Invalid or expired link'}</h2>
          <p>${
            ok
              ? "You won't receive any more automated emails from EventEcos. Account and billing notifications are unaffected."
              : 'This unsubscribe link is invalid. Please contact support if you continue to receive unwanted emails.'
          }</p>
        </body>
      </html>
    `);
  }
}
