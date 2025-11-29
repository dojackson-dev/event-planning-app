import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class IntakeFormsService {
  constructor(private readonly supabaseService: SupabaseService) {}

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
      owner_id: userId,
      name: `${intakeForm.event_type} Event - ${intakeForm.contact_name}`,
      date: intakeForm.event_date,
      start_time: intakeForm.event_time || '00:00',
      description: intakeForm.special_requests || '',
      status: 'scheduled' as const,
      guest_count: intakeForm.guest_count,
    };

    const { data: event, error: eventError } = await supabase
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

    const { data: booking, error: bookingError } = await supabase
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
}

