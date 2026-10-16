import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NonprofitService, VerifyNonprofitDto } from './nonprofit.service';

@Controller('nonprofit')
export class NonprofitController {
  constructor(
    private readonly service: NonprofitService,
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
}
