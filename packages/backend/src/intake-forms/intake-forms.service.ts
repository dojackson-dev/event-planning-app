import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

@Injectable()
export class IntakeFormsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  async create(supabase: SupabaseClient, userId: string, createDto: any) {
    // Temporarily remove accessibility_requirements due to PostgREST cache issue
    const { accessibility_requirements, ...dtoWithoutAccessibility } = createDto;
    
    const { data, error } = await supabase
      .from('intake_forms')
      .insert([{ ...dtoWithoutAccessibility, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(supabase: SupabaseClient, userId: string, id: string) {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, userId: string, id: string, updateDto: any) {
    const { data, error } = await supabase
      .from('intake_forms')
      .update(updateDto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(supabase: SupabaseClient, userId: string, id: string) {
    const { error } = await supabase
      .from('intake_forms')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return { message: 'Intake form deleted successfully' };
  }

  async convertToBooking(supabase: SupabaseClient, userId: string, intakeFormId: string) {
    // Use admin client to bypass RLS for events and bookings tables
    const supabaseAdmin = this.supabaseService.getAdminClient();
    
    // Get the intake form
    const { data: intakeForm, error: intakeError } = await supabase
      .from('intake_forms')
      .select('*')
      .eq('id', intakeFormId)
      .eq('user_id', userId)
      .single();

    if (intakeError) throw intakeError;
    if (!intakeForm) throw new Error('Intake form not found');

    // Create an event first
    const eventData = {
      name: `${intakeForm.event_type} Event - ${intakeForm.contact_name}`,
      date: intakeForm.event_date,
      start_time: intakeForm.event_time || '00:00',
      end_time: '23:59', // Default end time
      description: intakeForm.special_requests || '',
      status: 'scheduled' as const,
      guest_count: intakeForm.guest_count,
      venue: 'TBD', // Default venue value
      owner_id: userId, // Required field
    };

    const { data: event, error: eventError } = await supabaseAdmin
      .from('event')
      .insert([eventData])
      .select()
      .single();

    if (eventError) throw eventError;

    // Create the booking
    const bookingData = {
      user_id: userId,
      event_id: event.id,
      booking_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      contact_name: intakeForm.contact_name,
      contact_email: intakeForm.contact_email,
      contact_phone: intakeForm.contact_phone,
      special_requests: [
        intakeForm.special_requests,
        intakeForm.catering_requirements ? `Catering: ${intakeForm.catering_requirements}` : null,
        intakeForm.equipment_needs ? `Equipment: ${intakeForm.equipment_needs}` : null,
        intakeForm.dietary_restrictions ? `Dietary: ${intakeForm.dietary_restrictions}` : null,
        intakeForm.accessibility_requirements ? `Accessibility: ${intakeForm.accessibility_requirements}` : null,
      ].filter(Boolean).join('\n'),
      notes: `Converted from intake form. Budget range: ${intakeForm.budget_range || 'Not specified'}`,
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('booking')
      .insert([bookingData])
      .select('*, event(*)')
      .single();

    if (bookingError) throw bookingError;

    // Update intake form status to 'converted'
    await supabase
      .from('intake_forms')
      .update({ status: 'converted' })
      .eq('id', intakeFormId)
      .eq('user_id', userId);

    return {
      booking,
      event,
      message: 'Successfully converted intake form to booking',
    };
  }

  /**
   * Public: fetch owner branding info for displaying on the public intake form.
   * No auth required — only exposes business_name and logo_url.
   */
  async getPublicOwnerInfo(ownerId: string): Promise<{ businessName: string; logoUrl: string | null }> {
    const admin = this.supabaseService.getAdminClient();

    // Resolve owner_account_id via memberships (primary) or direct user_id (fallback)
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', ownerId)
      .limit(1)
      .maybeSingle();

    let ownerAccountId = membership?.owner_account_id ?? null;

    if (!ownerAccountId) {
      const { data: ownerAccount } = await admin
        .from('owner_accounts')
        .select('id')
        .eq('user_id', ownerId)
        .maybeSingle();
      ownerAccountId = ownerAccount?.id ?? null;
    }

    if (!ownerAccountId) return { businessName: '', logoUrl: null };

    const { data } = await admin
      .from('owner_accounts')
      .select('business_name, logo_url')
      .eq('id', ownerAccountId)
      .maybeSingle();

    return {
      businessName: data?.business_name || '',
      logoUrl: data?.logo_url || null,
    };
  }

  /**
   * Public: submit an intake form on behalf of a client (no auth token).
   * Saves the form with user_id = ownerId, then SMS-notifies the owner.
   */
  async createPublic(ownerId: string, dto: any): Promise<any> {
    const admin = this.supabaseService.getAdminClient();

    // Strip field causing PostgREST cache issues
    const { accessibility_requirements, ...dtoWithoutAccessibility } = dto;

    const { data, error } = await admin
      .from('intake_forms')
      .insert([{ ...dtoWithoutAccessibility, user_id: ownerId }])
      .select()
      .single();

    if (error) throw error;

    // Look up owner's phone from users table and send SMS notification
    try {
      const { data: ownerUser } = await admin
        .from('users')
        .select('phone_number')
        .eq('id', ownerId)
        .maybeSingle();

      const ownerPhone: string | null = (ownerUser as any)?.phone_number ?? null;
      const clientName = dto.contact_name || `${dto.first_name || ''} ${dto.last_name || ''}`.trim() || 'A client';
      const eventType = dto.event_type || 'event';
      const eventDate = dto.event_date || 'a date TBD';

      await this.smsNotifications.newIntakeFormSubmission(ownerPhone, clientName, eventType, eventDate);
    } catch {
      // SMS errors must never block form submission
    }

    return data;
  }
}

