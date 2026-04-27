import {
  Controller, Get, Post, Delete, Body, Param, Headers, UnauthorizedException,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('team')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization?: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  /** GET /team/members */
  @Get('members')
  async getMembers(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.teamService.getMembers(userId);
  }

  /** GET /team/invitations */
  @Get('invitations')
  async getInvitations(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.teamService.getInvitations(userId);
  }

  /** POST /team/invite */
  @Post('invite')
  async inviteAssociate(
    @Headers('authorization') auth: string,
    @Body('email') email: string,
  ) {
    if (!email) throw new UnauthorizedException('Email is required');
    const userId = await this.getUserId(auth);
    return this.teamService.inviteAssociate(userId, email);
  }

  /** GET /team/invite-info/:token — public, no auth required */
  @Get('invite-info/:token')
  async getInviteInfo(@Param('token') token: string) {
    return this.teamService.getInviteInfo(token);
  }

  /** POST /team/accept */
  @Post('accept')
  async acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
  ) {
    if (!token) throw new UnauthorizedException('Token is required');
    return this.teamService.acceptInvite(token, password, firstName, lastName);
  }

  /** DELETE /team/members/:memberUserId */
  @Delete('members/:memberUserId')
  async removeMember(
    @Headers('authorization') auth: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.teamService.removeMember(userId, memberUserId);
  }

  /** DELETE /team/invitations/:id */
  @Delete('invitations/:id')
  async cancelInvitation(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.teamService.cancelInvitation(userId, id);
  }
}
