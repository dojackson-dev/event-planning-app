import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InvoicePaymentsService } from './invoice-payments.service';
import type { RecordPaymentInput } from './invoice-payments.service';

@Controller('invoice-payments')
export class InvoicePaymentsController {
  constructor(
    private readonly payments: InvoicePaymentsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization?: string): Promise<string> {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    const token = authorization.replace('Bearer ', '');
    const {
      data: { user },
      error,
    } = await this.supabaseService.setAuthContext(token).auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  /** POST /invoice-payments/payments/:paymentId/void — declared first so it is not read as :kind/:invoiceId. */
  @Post('payments/:paymentId/void')
  async voidPayment(
    @Headers('authorization') authorization: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { reason?: unknown },
  ) {
    const userId = await this.getUserId(authorization);
    return this.payments.voidPayment(paymentId, userId, body?.reason);
  }

  /** GET /invoice-payments/:kind/:invoiceId — payment history for an invoice the user owns. */
  @Get(':kind/:invoiceId')
  async list(
    @Headers('authorization') authorization: string,
    @Param('kind') kind: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.payments.list(kind, invoiceId, userId);
  }

  /** POST /invoice-payments/:kind/:invoiceId — record a manual payment. */
  @Post(':kind/:invoiceId')
  async record(
    @Headers('authorization') authorization: string,
    @Param('kind') kind: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: RecordPaymentInput,
  ) {
    const userId = await this.getUserId(authorization);
    return this.payments.record(kind, invoiceId, userId, body ?? {});
  }
}
