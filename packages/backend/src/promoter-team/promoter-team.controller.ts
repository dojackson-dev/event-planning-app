import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PromoterTeamService } from './promoter-team.service';

@Controller('promoter-team')
export class PromoterTeamController {
  constructor(
    private readonly team: PromoterTeamService,
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

  /** GET /promoter-team/me — owner / admin / staff / null */
  @Get('me')
  async me(@Headers('authorization') auth: string) {
    return this.team.getMe(await this.getUserId(auth));
  }

  @Get('members')
  async members(@Headers('authorization') auth: string) {
    return this.team.listMembers(await this.getUserId(auth));
  }

  @Get('invitations')
  async invitations(@Headers('authorization') auth: string) {
    return this.team.listInvitations(await this.getUserId(auth));
  }

  @Post('invite')
  async invite(
    @Headers('authorization') auth: string,
    @Body() body: { email: string; role: string },
  ) {
    return this.team.invite(
      await this.getUserId(auth),
      body?.email,
      body?.role,
    );
  }

  @Post('invitations/:id/resend')
  async resend(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.team.resendInvitation(await this.getUserId(auth), id);
  }

  @Delete('invitations/:id')
  async cancel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.team.cancelInvitation(await this.getUserId(auth), id);
  }

  /** DELETE /promoter-team/members/:id — only the account creator */
  @Delete('members/:id')
  async remove(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.team.removeMember(await this.getUserId(auth), id);
  }
}
