import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { TwilioService } from '../messaging/twilio.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { EventsService } from '../events/events.service';
import { SupabaseClient } from '@supabase/supabase-js';

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

@Injectable()
export class IntakeFormsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
    private readonly twilioService: TwilioService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly eventsService: EventsService,
  ) {}

  private async autoCreateEvent(
    intakeForm: any,
    ownerId: string,
  ): Promise<void> {
    try {
      const supabaseAdmin = this.supabaseService.getAdminClient();
      await supabaseAdmin.from('event').insert([{
        name: `${intakeForm.event_type || 'Event'} - ${intakeForm.contact_name || 'Client'}`,
        date: intakeForm.event_date || new Date().toISOString().split('T')[0],
        start_time: intakeForm.event_time || null,
        venue: intakeForm.venue_preference || null,
        guest_count: intakeForm.guest_count || null,
        description: intakeForm.special_requests || null,
        status: 'scheduled',
        owner_id: ownerId,
        client_id: intakeForm.id,
      }]);
      console.log(`[IntakeFormsService] Auto-created event for intake form ${intakeForm.id}`);
    } catch (err) {
      console.warn('[IntakeFormsService] Auto-create event failed:', err);
    }
  }

  async create(supabase: SupabaseClient, userId: string, createDto: any) {
    // Remove columns that don't exist in the intake_forms table
    const { accessibility_requirements, preferred_contact, ...safeDto } = createDto;

    // Normalize phone to E.164 on the way in
    if (safeDto.contact_phone) {
      safeDto.contact_phone = normalizePhone(safeDto.contact_phone);
    }

    // Use admin client to bypass RLS for the insert (owner creating a client intake form)
    const supabaseAdmin = this.supabaseService.getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('intake_forms')
      .insert([{ ...safeDto, user_id: userId }])
      .select()
      .single();

    if (error) throw new Error(`Intake form insert failed: ${error.message} (code: ${error.code})`);

    // Send invitation email to client if contact_email is present
    if (data?.contact_email && data?.invite_token) {
      // Optionally look up the owner's name for a personal touch in the email
      let ownerName: string | undefined;
      try {
        const { data: owner } = await supabaseAdmin
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .maybeSingle();
        if (owner) ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
      } catch { /* ignore */ }

      await this.mailService.sendClientInvitation({
        clientName: data.contact_name || 'Valued Client',
        clientEmail: data.contact_email,
        inviteToken: data.invite_token,
        eventType: data.event_type || 'Event',
        eventDate: data.event_date,
        eventTime: data.event_time ?? null,
        guestCount: data.guest_count ?? null,
        ownerName,
      });

      // Mark invite_sent_at
      await supabaseAdmin
        .from('intake_forms')
        .update({ invite_sent_at: new Date().toISOString(), invite_status: 'sent' })
        .eq('id', data.id);
      data.invite_sent_at = new Date().toISOString();
      data.invite_status = 'sent';
    }

    // Send SMS invitation if contact_phone is present (independent of email)
    if (data?.contact_phone && data?.invite_token) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteUrl = `${frontendUrl}/invite?token=${data.invite_token}`;
        const clientName = data.contact_name || 'Valued Client';
        await this.twilioService.sendSMS(
          data.contact_phone,
          `Hi ${clientName}, you've been invited to confirm your event details. Tap here to review and confirm: ${inviteUrl}`,
        );
      } catch (smsErr) {
        console.warn('[IntakeFormsService] SMS invite failed:', smsErr);
      }
    }

    // Auto-create an event for this intake form
    await this.autoCreateEvent(data, userId);

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
    // Normalize phone on update too
    if (updateDto.contact_phone) {
      updateDto.contact_phone = normalizePhone(updateDto.contact_phone);
    }
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

  /**
   * Resend the invitation email to the client for a given intake form.
   * Resets invite_status to 'sent' regardless of current state.
   */
  async resendInvitation(supabase: SupabaseClient, userId: string, id: string) {
    const supabaseAdmin = this.supabaseService.getAdminClient();

    const { data: form, error } = await supabase
      .from('intake_forms')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !form) throw new Error('Intake form not found');
    if (!form.contact_email) throw new Error('This intake form has no client email address');

    let ownerName: string | undefined;
    try {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      if (owner) ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
    } catch { /* ignore */ }

    await this.mailService.sendClientInvitation({
      clientName: form.contact_name || 'Valued Client',
      clientEmail: form.contact_email,
      inviteToken: form.invite_token,
      eventType: form.event_type || 'Event',
      eventDate: form.event_date,
      eventTime: form.event_time ?? null,
      guestCount: form.guest_count ?? null,
      ownerName,
    });

    await supabaseAdmin
      .from('intake_forms')
      .update({ invite_sent_at: new Date().toISOString(), invite_status: 'sent' })
      .eq('id', id);

    // Also resend via SMS if phone is available (independent channel)
    if (form.contact_phone) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteUrl = `${frontendUrl}/invite?token=${form.invite_token}`;
        await this.twilioService.sendSMS(
          form.contact_phone,
          `Hi ${form.contact_name || 'Valued Client'}, you've been invited to confirm your event details. Tap here to review and confirm: ${inviteUrl}`,
        );
      } catch (smsErr) {
        console.warn('[IntakeFormsService] SMS resend failed:', smsErr);
      }
    }

    return { success: true, message: 'Invitation resent successfully' };
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

    // Always mark the booking as pending client confirmation when there's a contact phone.
    // This allows ANY phone-only client (even without a users table entry) to see the
    // confirmation card when they log into the client portal.
    if (intakeForm.contact_phone) {
      try {
        await supabaseAdmin
          .from('booking')
          .update({ client_confirmation_status: 'pending' })
          .eq('id', booking.id);
        booking.client_confirmation_status = 'pending';
      } catch {
        // Column may not exist yet if migration hasn't been run — safe to ignore
        console.warn('[convertToBooking] client_confirmation_status column missing — run add-client-confirmation-to-booking.sql migration');
      }
    }

    // ── Steps 6 & 7: notify conflicting same-date leads automatically ──────────
    // Find all other intake forms for this owner on the same date that haven't
    // already been converted. Send each an SMS informing them the date is taken.
    try {
      const eventDateStr = intakeForm.event_date.split('T')[0];

      const { data: conflicting } = await supabaseAdmin
        .from('intake_forms')
        .select('id, contact_name, contact_phone, event_date')
        .eq('user_id', userId)
        .neq('id', intakeFormId)
        .neq('status', 'converted')
        .filter('event_date', 'gte', eventDateStr)
        .filter('event_date', 'lt', `${eventDateStr}T23:59:59`);

      if (conflicting && conflicting.length > 0) {
        const formattedDate = new Date(`${eventDateStr}T12:00:00`).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        for (const lead of conflicting) {
          if (!lead.contact_phone) continue;
          const phone = normalizePhone(lead.contact_phone);
          const message =
            `Hi ${lead.contact_name}, we wanted to let you know that ${formattedDate} ` +
            `has been reserved by another client and is no longer available. ` +
            `Please contact us so we can help you choose a new date for your event.`;
          try {
            await this.twilioService.sendSMS(phone, message);
          } catch (smsErr) {
            console.warn(`[convertToBooking] SMS failed for lead ${lead.id}:`, smsErr);
          }
        }
      }
    } catch (notifyErr) {
      // Non-fatal — booking was already confirmed; just log
      console.warn('[convertToBooking] Conflict notification error:', notifyErr);
    }

    return {
      booking,
      event,
      message: 'Successfully converted intake form to booking',
    };
  }

  async getPublicOwnerInfo(ownerId: string) {
    const supabaseAdmin = this.supabaseService.getAdminClient();
    const { data: owner, error } = await supabaseAdmin
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', ownerId)
      .maybeSingle();
    if (error || !owner) throw new Error('Owner not found');
    return {
      ownerName: [owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Event Planner',
    };
  }

  async createPublic(ownerId: string, dto: any) {
    const supabaseAdmin = this.supabaseService.getAdminClient();
    const { accessibility_requirements, preferred_contact, ...safeDto } = dto;

    if (safeDto.contact_phone) {
      safeDto.contact_phone = normalizePhone(safeDto.contact_phone);
    }

    const { data, error } = await supabaseAdmin
      .from('intake_forms')
      .insert([{ ...safeDto, user_id: ownerId }])
      .select()
      .single();

    if (error) throw new Error(`Public intake form insert failed: ${error.message}`);

    // Auto-create an event for this intake form
    await this.autoCreateEvent(data, ownerId);

    // Notify the owner via SMS
    try {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('id', ownerId)
        .maybeSingle();
      const ownerPhone = (owner as any)?.phone ?? null;
      const eventDate = safeDto.event_date
        ? new Date(safeDto.event_date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })
        : 'TBD';
      await this.smsNotifications.newIntakeFormSubmission(
        ownerPhone,
        safeDto.contact_name || 'A client',
        safeDto.event_type || 'event',
        eventDate,
      );
    } catch (smsErr) {
      console.warn('[IntakeFormsService.createPublic] Owner SMS failed:', smsErr);
    }

    return data;
  }
}

