import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { IntakeFormsService } from './intake-forms.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('intake-forms')
export class IntakeFormsController {
  constructor(
    private readonly intakeFormsService: IntakeFormsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization: string): Promise<string> {
    const token = this.extractToken(authorization);
    
    // Handle dev tokens (local-<uuid> format)
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }
    
    // Handle Supabase tokens
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabaseWithAuth.auth.getUser();
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user.id;
  }

  /** Resolves an identifier that is either a UUID (primary_owner_id) or an intake_slug.
   *  Returns the primary_owner_id (UUID) in both cases. */
  private async resolveOwnerIdentifier(identifier: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (isUuid) {
      const { data, error } = await admin
        .from('owner_accounts')
        .select('primary_owner_id')
        .eq('primary_owner_id', identifier)
        .single();
      if (error || !data) throw new NotFoundException('Owner not found');
      return data.primary_owner_id;
    }

    // Treat as a slug
    const { data, error } = await admin
      .from('owner_accounts')
      .select('primary_owner_id')
      .eq('intake_slug', identifier)
      .single();
    if (error || !data) throw new NotFoundException('Owner not found');
    return data.primary_owner_id;
  }

  /** Public: returns the owner's business name so the form page can display a branded header.
   *  Accepts either a UUID or an intake_slug as :ownerId. */
  @Get('public-form/:ownerId')
  async getPublicFormInfo(@Param('ownerId') ownerId: string) {
    const admin = this.supabaseService.getAdminClient();
    const resolvedId = await this.resolveOwnerIdentifier(ownerId);
    const { data, error } = await admin
      .from('owner_accounts')
      .select('business_name, logo_url, intake_slug')
      .eq('primary_owner_id', resolvedId)
      .single();
    if (error || !data) throw new NotFoundException('Owner not found');
    return { businessName: data.business_name, logoUrl: data.logo_url, intakeSlug: data.intake_slug };
  }

  @Post()
  async create(@Headers('authorization') authorization: string, @Body() createDto: any) {
    try {
      console.log('Received intake form data:', JSON.stringify(createDto, null, 2));
      const token = this.extractToken(authorization);
      const userId = await this.getUserId(authorization);
      const supabaseWithAuth = this.supabaseService.setAuthContext(token);
      const result = await this.intakeFormsService.create(supabaseWithAuth, userId, createDto);
      console.log('Successfully created intake form:', result);
      return result;
    } catch (error: any) {
      console.error('Error creating intake form:', error?.message || error);
      throw error;
    }
  }

  @Get()
  async findAll(@Headers('authorization') authorization: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.findAll(supabaseWithAuth, userId);
  }

  // ── Authenticated routes ───────────────────────────────────────────────────

  @Get(':id')
  async findOne(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.findOne(supabaseWithAuth, userId, id);
  }

  @Put(':id')
  async update(@Headers('authorization') authorization: string, @Param('id') id: string, @Body() updateDto: any) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.update(supabaseWithAuth, userId, id, updateDto);
  }

  @Delete(':id')
  async remove(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.remove(supabaseWithAuth, userId, id);
  }

  @Post(':id/convert-to-booking')
  async convertToBooking(@Headers('authorization') authorization: string, @Param('id') id: string) {
    try {
      console.log('Converting intake form to booking:', id);
      const token = this.extractToken(authorization);
      const userId = await this.getUserId(authorization);
      console.log('User ID:', userId);
      const supabaseWithAuth = this.supabaseService.setAuthContext(token);
      const result = await this.intakeFormsService.convertToBooking(supabaseWithAuth, userId, id);
      console.log('Successfully converted to booking:', result);
      return result;
    } catch (error) {
      console.error('Error converting to booking:', error);
      throw error;
    }
  }

  @Post(':id/recreate-event')
  async recreateEvent(@Headers('authorization') authorization: string, @Param('id') id: string) {
    try {
      console.log('Recreating event for intake form:', id);
      const token = this.extractToken(authorization);
      const userId = await this.getUserId(authorization);
      const supabaseWithAuth = this.supabaseService.setAuthContext(token);
      const result = await this.intakeFormsService.recreateEvent(supabaseWithAuth, userId, id);
      console.log('Successfully recreated event:', result);
      return result;
    } catch (error) {
      console.error('Error recreating event:', error);
      throw error;
    }
  }

  @Post(':id/resend-invitation')
  async resendInvitation(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.resendInvitation(supabaseWithAuth, userId, id);
  }
}
