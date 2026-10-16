import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NonprofitService, VerifyNonprofitDto } from './nonprofit.service';
import { SponsorshipLevelDto, SponsorshipService } from './sponsorship.service';
import {
  SponsorshipCheckoutDto,
  SponsorshipCheckoutService,
} from './sponsorship-checkout.service';

@Controller('nonprofit')
export class NonprofitController {
  constructor(
    private readonly service: NonprofitService,
    private readonly sponsorships: SponsorshipService,
    private readonly sponsorshipCheckout: SponsorshipCheckoutService,
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

  /** GET /nonprofit/status — current non-profit status of my promoter account. */
  @Get('status')
  async status(@Headers('authorization') authorization: string) {
    return this.service.getStatus(await this.getUserId(authorization));
  }

  /** POST /nonprofit/verify — check an EIN against IRS data and save the result. */
  @Post('verify')
  async verify(
    @Headers('authorization') authorization: string,
    @Body() dto: VerifyNonprofitDto,
  ) {
    return this.service.verify(await this.getUserId(authorization), dto);
  }

  /** Public: active sponsorship levels for a published event. */
  @Get('public/events/:eventId/sponsorship-levels')
  listPublicLevels(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.sponsorships.listPublic(eventId);
  }

  /** Public: start a Stripe Checkout for one sponsorship level. */
  @Post('public/sponsorship-levels/:levelId/checkout')
  checkoutLevel(
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Body() dto: SponsorshipCheckoutDto,
  ) {
    return this.sponsorshipCheckout.createCheckout(levelId, dto);
  }

  @Get('events/:eventId/sponsorship-levels')
  async listLevels(
    @Headers('authorization') authorization: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.sponsorships.list(await this.getUserId(authorization), eventId);
  }

  @Post('events/:eventId/sponsorship-levels')
  async createLevel(
    @Headers('authorization') authorization: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: SponsorshipLevelDto,
  ) {
    return this.sponsorships.create(
      await this.getUserId(authorization),
      eventId,
      dto,
    );
  }

  @Put('sponsorship-levels/:levelId')
  async updateLevel(
    @Headers('authorization') authorization: string,
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Body() dto: SponsorshipLevelDto,
  ) {
    return this.sponsorships.update(
      await this.getUserId(authorization),
      levelId,
      dto,
    );
  }

  @Delete('sponsorship-levels/:levelId')
  async deleteLevel(
    @Headers('authorization') authorization: string,
    @Param('levelId', ParseUUIDPipe) levelId: string,
  ) {
    return this.sponsorships.remove(
      await this.getUserId(authorization),
      levelId,
    );
  }
}
