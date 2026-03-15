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

  // ─────────────────────────────────────────────
  // GET /owner/venue
  // Returns the primary venue for this owner
  // ─────────────────────────────────────────────
  @Get('venue')
  async getVenue(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    // Get owner_account
    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('id, business_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownerAccount) {
      return { venue: null, businessName: '' };
    }

    // Get first venue
    const { data: venue, error } = await admin
      .from('venues')
      .select('id, name, address, city, state, zip_code, phone, email, capacity, description')
      .eq('owner_account_id', ownerAccount.id)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[owner/venue] DB error:', error.message);
    }

    return {
      businessName: ownerAccount.business_name || '',
      venue: venue || null,
    };
  }

  // ─────────────────────────────────────────────
  // PUT /owner/venue
  // Updates the primary venue details
  // ─────────────────────────────────────────────
  @Put('venue')
  async updateVenue(
    @Headers('authorization') authorization: string,
    @Body() body: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      email?: string;
      capacity?: number;
      description?: string;
    },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownerAccount) throw new BadRequestException('Owner account not found');

    // Get venue id
    const { data: venue } = await admin
      .from('venues')
      .select('id')
      .eq('owner_account_id', ownerAccount.id)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.zipCode !== undefined) updateData.zip_code = body.zipCode;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.capacity !== undefined) updateData.capacity = body.capacity || null;
    if (body.description !== undefined) updateData.description = body.description;

    if (venue) {
      // Update existing venue
      const { error } = await admin
        .from('venues')
        .update(updateData)
        .eq('id', venue.id);

      if (error) throw new BadRequestException(error.message);
    } else {
      // Create venue if none exists
      const { error } = await admin
        .from('venues')
        .insert({
          owner_account_id: ownerAccount.id,
          name: body.name || 'My Venue',
          address: body.address,
          city: body.city,
          state: body.state,
          zip_code: body.zipCode,
          phone: body.phone,
          email: body.email,
          capacity: body.capacity || null,
          description: body.description,
        });

      if (error) throw new BadRequestException(error.message);
    }

    return { success: true };
  }
}
