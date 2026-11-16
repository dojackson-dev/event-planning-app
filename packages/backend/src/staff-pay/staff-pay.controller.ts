import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { StaffPayService } from './staff-pay.service';
import { StaffPayoutsService } from './staff-payouts.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('staff-pay')
export class StaffPayController {
  constructor(
    private readonly staffPay: StaffPayService,
    private readonly payouts: StaffPayoutsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    if (
      token.startsWith('local-') &&
      process.env.ALLOW_LOCAL_DEV_AUTH === 'true'
    )
      return token.replace('local-', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ── Worker clock page: public, the secret link is the credential ──

  @Get('public/shift/:token')
  publicView(@Param('token') token: string) {
    return this.staffPay.publicView(token);
  }

  @Post('public/shift/:token/clock-in')
  clockIn(@Param('token') token: string) {
    return this.staffPay.clockIn(token);
  }

  @Post('public/shift/:token/clock-out')
  clockOut(@Param('token') token: string) {
    return this.staffPay.clockOut(token);
  }

  // ── Worker payout setup: public, the secret link is the credential ──

  @Get('public/payout-setup/:token')
  setupView(@Param('token') token: string) {
    return this.payouts.setupView(token);
  }

  @Post('public/payout-setup/:token/start')
  startSetup(@Param('token') token: string) {
    return this.payouts.startSetup(token);
  }

  // ── Venue owner ──

  @Get('members')
  async members(@Headers('authorization') auth: string) {
    return this.staffPay.listMembers(await this.getUserId(auth));
  }

  @Post('members')
  async createMember(
    @Headers('authorization') auth: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.staffPay.createMember(await this.getUserId(auth), body);
  }

  @Put('members/:id')
  async updateMember(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.staffPay.updateMember(await this.getUserId(auth), id, body);
  }

  @Get('shifts')
  async shifts(
    @Headers('authorization') auth: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('event_id') eventId?: string,
  ) {
    return this.staffPay.listShifts(await this.getUserId(auth), {
      from,
      to,
      status,
      eventId,
    });
  }

  @Post('shifts')
  async createShifts(
    @Headers('authorization') auth: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.staffPay.createShifts(await this.getUserId(auth), body);
  }

  @Put('shifts/:id')
  async updateShift(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.staffPay.updateShift(await this.getUserId(auth), id, body);
  }

  @Post('shifts/:id/approve')
  async approve(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = await this.getUserId(auth);
    return this.staffPay.approveShift(userId, userId, id, body);
  }

  @Post('shifts/:id/cancel')
  async cancel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.staffPay.cancelShift(await this.getUserId(auth), id);
  }

  @Post('shifts/:id/send-link')
  async sendLink(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.staffPay.resendLink(await this.getUserId(auth), id);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="staff-pay.csv"')
  async export(
    @Headers('authorization') auth: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.staffPay.exportCsv(await this.getUserId(auth), from, to);
  }

  // ── Paying workers ──

  @Post('members/:id/payout-setup')
  async sendSetupLink(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.payouts.sendSetupLink(await this.getUserId(auth), id);
  }

  @Get('payouts/preview')
  async payoutPreview(@Headers('authorization') auth: string) {
    return this.payouts.preview(await this.getUserId(auth));
  }

  @Post('payouts/checkout')
  async payoutCheckout(
    @Headers('authorization') auth: string,
    @Body() body: { method?: unknown },
  ) {
    return this.payouts.createCheckout(await this.getUserId(auth), body ?? {});
  }

  @Get('payouts')
  async payoutList(@Headers('authorization') auth: string) {
    return this.payouts.list(await this.getUserId(auth));
  }

  @Post('payouts/:id/cancel')
  async payoutCancel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.payouts.cancel(await this.getUserId(auth), id);
  }

  @Post('payouts/:id/retry')
  async payoutRetry(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.payouts.retry(await this.getUserId(auth), id);
  }
}
