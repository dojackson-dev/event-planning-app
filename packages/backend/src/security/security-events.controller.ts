import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { SecurityEventsService } from './security-events.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('security')
export class SecurityEventsController {
  constructor(
    private readonly security: SecurityEventsService,
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

  // ── Guard check-in: public, the secret link is the credential ──

  @Get('public/check-in/:token')
  publicView(@Param('token') token: string) {
    return this.security.publicView(token);
  }

  @Post('public/check-in/:token/arrive')
  publicArrive(@Param('token') token: string) {
    return this.security.publicArrive(token);
  }

  // ── Venue owner, per event ──

  @Get('event/:eventId/guards')
  async guards(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
  ) {
    return this.security.list(await this.getUserId(auth), eventId);
  }

  @Get('event/:eventId/directory')
  async directory(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
  ) {
    return this.security.directory(await this.getUserId(auth), eventId);
  }

  @Post('event/:eventId/assign')
  async assign(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.security.assign(
      await this.getUserId(auth),
      eventId,
      body ?? {},
    );
  }

  @Post('guard/:id/resend')
  async resend(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.security.resend(await this.getUserId(auth), id);
  }

  @Post('guard/:id/arrived')
  async arrived(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: { arrived?: boolean },
  ) {
    return this.security.setArrival(
      await this.getUserId(auth),
      id,
      body?.arrived !== false,
    );
  }
}
