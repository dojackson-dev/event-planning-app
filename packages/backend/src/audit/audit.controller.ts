import { Controller, Get, Query, Headers, UnauthorizedException, ParseIntPipe, DefaultValuePipe, Optional } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getOwnerAccountId(authorization?: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');

    const admin = this.supabaseService.getAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', user.id)
      .in('role', ['owner'])
      .eq('is_active', true)
      .maybeSingle();

    if (!membership?.owner_account_id) throw new UnauthorizedException('Owner account not found');
    return membership.owner_account_id;
  }

  /** GET /audit/log?limit=100 */
  @Get('log')
  async getLog(
    @Headers('authorization') auth: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const ownerAccountId = await this.getOwnerAccountId(auth);
    return this.auditService.getLog(ownerAccountId, Math.min(limit, 500));
  }
}
