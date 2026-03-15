import {
  Controller,
  Get,
  Put,
  Body,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('owner')
export class OwnerController {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─────────────────────────────────────────────
  // GET /owner/profile
  // Returns owner branding: businessName + logoUrl
  // ─────────────────────────────────────────────
  @Get('profile')
  async getProfile(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('owner_accounts')
      .select('business_name, logo_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[owner/profile] DB error:', error.message);
    }

    return {
      businessName: data?.business_name || '',
      logoUrl: data?.logo_url || null,
    };
  }

  // ─────────────────────────────────────────────
  // PUT /owner/profile
  // Updates owner branding (logoUrl)
  // ─────────────────────────────────────────────
  @Put('profile')
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() body: { logoUrl?: string | null },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const { error } = await admin
      .from('owner_accounts')
      .update({
        logo_url: body.logoUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[owner/profile] Update error:', error.message);
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }
}
