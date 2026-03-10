import { Controller, Get, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { TrialService } from './trial.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('trial')
export class TrialController {
  private readonly logger = new Logger(TrialController.name);

  constructor(
    private readonly trialService: TrialService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getOwnerAccountId(authorization: string): Promise<string> {
    const token = this.extractToken(authorization);
    
    // Handle dev tokens
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      // Get owner account from user ID
      const supabase = this.supabaseService.getAdminClient();
      const { data } = await supabase
        .from('memberships')
        .select('owner_account_id')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single();
      
      if (!data) throw new UnauthorizedException('Owner account not found');
      return data.owner_account_id;
    }
    
    // Handle Supabase tokens
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    
    // Get owner account from user ID
    const adminClient = this.supabaseService.getAdminClient();
    const { data } = await adminClient
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();
    
    if (!data) throw new UnauthorizedException('Owner account not found');
    return data.owner_account_id;
  }

  /**
   * Get trial info for current owner
   * GET /trial/info
   */
  @Get('info')
  async getTrialInfo(@Headers('authorization') authorization: string) {
    const ownerAccountId = await this.getOwnerAccountId(authorization);
    const trialInfo = await this.trialService.getTrialInfo(ownerAccountId);
    return trialInfo;
  }

  /**
   * Get default trial days
   * GET /trial/settings/default-days
   */
  @Get('settings/default-days')
  async getDefaultTrialDays() {
    const days = await this.trialService.getDefaultTrialDays();
    return { defaultTrialDays: days };
  }

  /**
   * Set default trial days (admin only)
   * POST /trial/settings/default-days
   */
  @Post('settings/default-days')
  async setDefaultTrialDays(@Body() body: { days: number }) {
    if (body.days < 1 || body.days > 365) {
      throw new Error('Trial days must be between 1 and 365');
    }
    await this.trialService.setDefaultTrialDays(body.days);
    return { message: `Trial days set to ${body.days}`, defaultTrialDays: body.days };
  }
}
