import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
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

  /**
   * Resolves the owner_account id for a given user.
   * Primary: looks up via memberships table (user_id → owner_account_id).
   * Fallback: primary_owner_id column on owner_accounts (auth UUID stored there).
   */
  private async getOwnerAccountId(userId: string, admin: any): Promise<number | null> {
    // Primary path: membership record links user → owner account
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership?.owner_account_id) return membership.owner_account_id;

    // Fallback: primary_owner_id on owner_accounts (the auth UUID stored as primary_owner_id)
    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('id')
      .eq('primary_owner_id', userId)
      .maybeSingle();

    return ownerAccount?.id ?? null;
  }

  // ─────────────────────────────────────────────
  // GET /owner/account-id
  // Returns the owner_account_id for the current user (used by billing page)
  // ─────────────────────────────────────────────
  @Get('account-id')
  async getAccountId(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    return { ownerAccountId };
  }

  // ─────────────────────────────────────────────
  // GET /owner/profile
  // Returns owner branding: businessName + logoUrl
  // ─────────────────────────────────────────────
  @Get('profile')
  async getProfile(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    console.log(`[owner/profile GET] userId=${userId} ownerAccountId=${ownerAccountId}`);
    if (!ownerAccountId) return { businessName: '', logoUrl: null };

    const { data, error } = await admin
      .from('owner_accounts')
      .select('business_name, logo_url, cover_image_url')
      .eq('id', ownerAccountId)
      .maybeSingle();

    if (error) {
      console.error('[owner/profile] DB error:', error.message);
    }

    return {
      businessName: data?.business_name || '',
      logoUrl: data?.logo_url || null,
      coverImageUrl: data?.cover_image_url || null,
    };
  }

  // ─────────────────────────────────────────────
  // PUT /owner/profile
  // Updates owner branding (logoUrl)
  // ─────────────────────────────────────────────
  @Put('profile')
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() body: { logoUrl?: string | null; coverImageUrl?: string | null; businessName?: string },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) throw new BadRequestException('Owner account not found');

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl;
    if (body.coverImageUrl !== undefined) updates.cover_image_url = body.coverImageUrl;
    if (body.businessName !== undefined && body.businessName.trim()) {
      updates.business_name = body.businessName.trim();
    }

    const { error } = await admin
      .from('owner_accounts')
      .update(updates)
      .eq('id', ownerAccountId);

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

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) return { venue: null, businessName: '' };

    // Get business name
    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('business_name')
      .eq('id', ownerAccountId)
      .maybeSingle();

    // Get first venue
    const { data: venue, error } = await admin
      .from('venues')
      .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
      .eq('owner_account_id', ownerAccountId)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[owner/venue] DB error:', error.message);
    }

    return {
      businessName: ownerAccount?.business_name || '',
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
      website?: string;
      capacity?: number;
      description?: string;
    },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) throw new BadRequestException('Owner account not found');

    // Get venue id
    const { data: venue } = await admin
      .from('venues')
      .select('id')
      .eq('owner_account_id', ownerAccountId)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.zipCode !== undefined) updateData.zip_code = body.zipCode;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.website !== undefined) updateData.website = body.website;
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
          owner_account_id: ownerAccountId,
          name: body.name || 'My Venue',
          address: body.address,
          city: body.city,
          state: body.state,
          zip_code: body.zipCode,
          phone: body.phone,
          website: body.website,
          capacity: body.capacity || null,
          description: body.description,
        });

      if (error) throw new BadRequestException(error.message);
    }

    return { success: true };
  }

  // ─────────────────────────────────────────────
  // GET /owner/payment-schedule
  // Returns the owner's default payment schedule settings
  // ─────────────────────────────────────────────
  @Get('payment-schedule')
  async getPaymentSchedule(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) return { depositPercentage: null, depositDueDaysBefore: null, finalPaymentDueDaysBefore: null };

    const { data, error } = await admin
      .from('owner_accounts')
      .select('default_deposit_percentage, default_deposit_due_days_before, default_final_payment_due_days_before')
      .eq('id', ownerAccountId)
      .maybeSingle();

    if (error) console.error('[owner/payment-schedule] DB error:', error.message);

    return {
      depositPercentage: data?.default_deposit_percentage ?? null,
      depositDueDaysBefore: data?.default_deposit_due_days_before ?? null,
      finalPaymentDueDaysBefore: data?.default_final_payment_due_days_before ?? null,
    };
  }

  // ─────────────────────────────────────────────
  // PUT /owner/payment-schedule
  // Saves the owner's default payment schedule
  // ─────────────────────────────────────────────
  @Put('payment-schedule')
  async updatePaymentSchedule(
    @Headers('authorization') authorization: string,
    @Body() body: {
      depositPercentage?: number | null;
      depositDueDaysBefore?: number | null;
      finalPaymentDueDaysBefore?: number | null;
    },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) throw new BadRequestException('Owner account not found');

    const { error } = await admin
      .from('owner_accounts')
      .update({
        default_deposit_percentage: body.depositPercentage ?? null,
        default_deposit_due_days_before: body.depositDueDaysBefore ?? null,
        default_final_payment_due_days_before: body.finalPaymentDueDaysBefore ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ownerAccountId);

    if (error) {
      console.error('[owner/payment-schedule] Update error:', error.message);
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }

  // ─────────────────────────────────────────────
  // GET /owner/trial-status
  // Returns current subscription status and trial info
  // ─────────────────────────────────────────────
  @Get('trial-status')
  async getTrialStatus(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();

    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) return { isTrial: false, subscriptionStatus: 'unknown', daysRemaining: 0, trialEndsAt: null };

    const { data } = await admin
      .from('owner_accounts')
      .select('subscription_status, trial_ends_at, referred_by_affiliate_id')
      .eq('id', ownerAccountId)
      .maybeSingle();

    // Only show trial UI for accounts that:
    // 1. Have an explicit trial_ends_at (created via the trial system), AND
    // 2. Were referred by an affiliate (came through a sales link)
    // This prevents pre-existing accounts or direct signups from seeing the trial banner.
    const isTrial =
      data?.subscription_status === 'trial' &&
      !!data?.trial_ends_at &&
      !!data?.referred_by_affiliate_id;
    let daysRemaining = 0;

    if (isTrial && data?.trial_ends_at) {
      const msRemaining = new Date(data.trial_ends_at).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    return {
      isTrial,
      subscriptionStatus: data?.subscription_status ?? 'unknown',
      daysRemaining,
      trialEndsAt: data?.trial_ends_at ?? null,
    };
  }

  // ─────────────────────────────────────────────
  // GET /owner/venues
  // Returns ALL venues for this owner
  // ─────────────────────────────────────────────
  @Get('venues')
  async getVenues(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) return { venues: [] };

    const { data, error } = await admin
      .from('venues')
      .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
      .eq('owner_account_id', ownerAccountId)
      .order('id', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return { venues: data || [] };
  }

  // ─────────────────────────────────────────────
  // POST /owner/venues
  // Creates a new venue for this owner
  // ─────────────────────────────────────────────
  @Post('venues')
  async createVenue(
    @Headers('authorization') authorization: string,
    @Body() body: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      website?: string;
      capacity?: number;
      description?: string;
    },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) throw new BadRequestException('Owner account not found');

    const { data, error } = await admin
      .from('venues')
      .insert({
        owner_account_id: ownerAccountId,
        name: body.name,
        address: body.address,
        city: body.city,
        state: body.state,
        zip_code: body.zipCode,
        phone: body.phone,
        website: body.website,
        capacity: body.capacity || null,
        description: body.description,
      })
      .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
      .single();

    if (error) throw new BadRequestException(error.message);
    return { venue: data };
  }

  // ─────────────────────────────────────────────
  // PUT /owner/venues/:id
  // Updates a specific venue owned by this owner
  // ─────────────────────────────────────────────
  @Put('venues/:id')
  async updateVenueById(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      website?: string;
      capacity?: number;
      description?: string;
    },
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) throw new BadRequestException('Owner account not found');

    // Verify the venue belongs to this owner
    const { data: existing } = await admin
      .from('venues')
      .select('id')
      .eq('id', id)
      .eq('owner_account_id', ownerAccountId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Venue not found');

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.zipCode !== undefined) updateData.zip_code = body.zipCode;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.capacity !== undefined) updateData.capacity = body.capacity || null;
    if (body.description !== undefined) updateData.description = body.description;

    const { data, error } = await admin
      .from('venues')
      .update(updateData)
      .eq('id', id)
      .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
      .single();

    if (error) throw new BadRequestException(error.message);
    return { venue: data };
  }

  // ─────────────────────────────────────────────
  // DELETE /owner/venues/:id
  // Deletes a specific venue owned by this owner
  // ─────────────────────────────────────────────
  @Delete('venues/:id')
  async deleteVenue(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(authorization);
    const admin = this.supabaseService.getAdminClient();
    const ownerAccountId = await this.getOwnerAccountId(userId, admin);
    if (!ownerAccountId) throw new BadRequestException('Owner account not found');

    const { data: existing } = await admin
      .from('venues')
      .select('id')
      .eq('id', id)
      .eq('owner_account_id', ownerAccountId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Venue not found');

    const { error } = await admin
      .from('venues')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}

