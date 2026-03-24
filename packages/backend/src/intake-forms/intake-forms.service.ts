import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

@Injectable()
export class IntakeFormsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(supabase: SupabaseClient, userId: string, createDto: any) {
    // Remove columns that don't exist in the intake_forms table
    const { accessibility_requirements, preferred_contact, ...safeDto } = createDto;
    
    const { data, error } = await supabase
      .from('intake_forms')
      .insert([{ ...safeDto, user_id: userId }])
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
      contact_phone: intakeForm.contact_phone ? normalizePhone(intakeForm.contact_phone) : null,
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

    // Mark the booking as pending client confirmation if a client account exists for
    // this phone. We match via contact_phone (normalized) so we do NOT touch user_id
    // (which has an auth.users FK constraint — client portal users are phone-only and
    // may not have auth.users entries).
    if (intakeForm.contact_phone) {
      const normalizedPhone = normalizePhone(intakeForm.contact_phone);
      const { data: clientUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (clientUser) {
        // Only update client_confirmation_status — never change user_id
        try {
          await supabaseAdmin
            .from('booking')
            .update({ client_confirmation_status: 'pending' })
            .eq('id', booking.id);
          booking.client_confirmation_status = 'pending';
        } catch {
          // Column may not exist yet if migration hasn't been run — safe to ignore
        }
      }
    }

    return {
      booking,
      event,
      message: 'Successfully converted intake form to booking',
    };
  }
}

