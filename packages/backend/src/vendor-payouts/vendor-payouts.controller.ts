import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VendorPayoutsService } from './vendor-payouts.service';

@Controller('vendors/payouts')
export class VendorPayoutsController {
  constructor(
    private readonly payouts: VendorPayoutsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  /** GET /vendors/payouts/instant - what the signed-in vendor can pay out instantly. */
  @Get('instant')
  async status(@Headers('authorization') authorization: string) {
    return this.payouts.getStatus(await this.getUserId(authorization));
  }

  /** POST /vendors/payouts/instant - pay out `amount_cents` now (Stripe charges the platform instant fee). */
  @Post('instant')
  async request(
    @Headers('authorization') authorization: string,
    @Body() body: { amount_cents?: unknown },
  ) {
    return this.payouts.requestInstantPayout(
      await this.getUserId(authorization),
      body?.amount_cents,
    );
  }
}
