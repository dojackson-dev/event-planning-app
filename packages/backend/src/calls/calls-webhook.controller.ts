import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { TwilioSignatureGuard } from './twilio-signature.guard';

type Params = Record<string, string>;

/** Endpoints Twilio calls. Every one is signature-checked, and all but the status callbacks answer with TwiML. */
@Controller('calls/hook')
@UseGuards(TwilioSignatureGuard)
export class CallsWebhookController {
  constructor(private readonly calls: CallsService) {}

  @Post('staff-gather')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  staffGather(@Query('logId') logId: string) {
    return this.calls.staffGather(logId);
  }

  @Post('staff-confirm')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  staffConfirm(@Query('logId') logId: string, @Body() body: Params) {
    return this.calls.staffConfirm(logId, body?.Digits);
  }

  @Post('staff-status')
  @HttpCode(204)
  async staffStatus(@Query('logId') logId: string, @Body() body: Params) {
    await this.calls.staffStatus(logId, body ?? {});
  }

  @Post('client-status')
  @HttpCode(204)
  async clientStatus(@Query('logId') logId: string, @Body() body: Params) {
    await this.calls.clientStatus(logId, body ?? {});
  }

  @Post('dial-result')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  dialResult(@Query('logId') logId: string, @Body() body: Params) {
    return this.calls.dialResult(logId, body ?? {});
  }

  @Post('incoming')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  incoming(@Body() body: Params) {
    return this.calls.incoming(body ?? {});
  }

  @Post('incoming-screen')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  incomingScreen(
    @Query('logId') logId: string,
    @Query('staffId') staffId: string,
    @Body() body: Params,
  ) {
    return this.calls.incomingScreen(logId, staffId, body?.Digits);
  }

  @Post('incoming-result')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  incomingResult(@Query('logId') logId: string, @Body() body: Params) {
    return this.calls.incomingResult(logId, body ?? {});
  }

  @Post('voicemail-done')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  voicemailDone() {
    return this.calls.voicemailDone();
  }

  @Post('voicemail-recording')
  @HttpCode(204)
  async voicemailRecording(
    @Query('logId') logId: string,
    @Body() body: Params,
  ) {
    await this.calls.voicemailRecording(logId, body ?? {});
  }
}
