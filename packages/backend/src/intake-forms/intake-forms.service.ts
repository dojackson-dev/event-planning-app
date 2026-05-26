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
    venueId?: string | null,
  ): Promise<void> {
    try {
      const supabaseAdmin = this.supabaseService.getAdminClient();

      // Deduplicate: skip if an event with the same owner, date, and name already exists
      const eventName = intakeForm.event_name || `${intakeForm.event_type || 'Event'} - ${intakeForm.contact_name || 'Client'}`;
      const eventDate = intakeForm.event_date || new Date().toISOString().split('T')[0];
      const { data: existing } = await supabaseAdmin
        .from('event')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('date', eventDate)
        .eq('name', eventName)
        .limit(1)
        .maybeSingle();
      if (existing) {
        console.log(`[IntakeFormsService] Skipping auto-create — event already exists (${existing.id})`);
        return;
      }

      // Resolve venue: use explicitly provided venueId first, then fall back to owner's primary venue
      const resolvedVenueId = venueId || await this.resolveOwnerVenueId(ownerId, supabaseAdmin);
      await supabaseAdmin.from('event').insert([{
        name: eventName,
        date: eventDate,
        start_time: intakeForm.event_time || null,
        end_time: intakeForm.event_end_time || null,
        venue: intakeForm.venue_preference || null,
        guest_count: intakeForm.guest_count || null,
        description: intakeForm.special_requests || null,
        status: 'scheduled',
        owner_id: ownerId,
        client_id: intakeForm.id,
        intake_form_id: intakeForm.id,
        ...(resolvedVenueId ? { venue_id: resolvedVenueId } : {}),
      }]);
      console.log(`[IntakeFormsService] Auto-created event for intake form ${intakeForm.id}`);
    } catch (err) {
      console.warn('[IntakeFormsService] Auto-create event failed:', err);
    }
  }

  /** Looks up the primary venue_id for an owner (used when auto-creating events). */
  private async resolveOwnerVenueId(userId: string, admin: any): Promise<string | null> {
    try {
      const { data: membership } = await admin
        .from('memberships')
        .select('owner_account_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      let ownerAccountId: number | null = membership?.owner_account_id ?? null;
      if (!ownerAccountId) {
        const { data: ownerAcct } = await admin
          .from('owner_accounts')
          .select('id')
          .eq('primary_owner_id', userId)
          .maybeSingle();
        ownerAccountId = ownerAcct?.id ?? null;
      }
      if (!ownerAccountId) return null;
      const { data: venue } = await admin
        .from('venues')
        .select('id')
        .eq('owner_account_id', ownerAccountId)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      return venue?.id ? String(venue.id) : null;
    } catch {
      return null;
    }
  }

  async create(supabase: SupabaseClient, userId: string, createDto: any) {
    // Remove columns that don't exist in the intake_forms table
    const { accessibility_requirements, preferred_contact, event_name, event_end_time, ...rest } = createDto;

    // Normalize phone to E.164 on the way in
    if (rest.contact_phone) {
      rest.contact_phone = normalizePhone(rest.contact_phone);
    }

    // Use admin client to bypass RLS for the insert (owner creating a client intake form)
    const supabaseAdmin = this.supabaseService.getAdminClient();

    // Try insert with the newer optional columns first; if the migration hasn't been
    // run yet those columns won't exist — fall back to the base column set.
    const fullPayload = {
      ...rest,
      user_id: userId,
      ...(event_name ? { event_name } : {}),
      ...(event_end_time ? { event_end_time } : {}),
    };

    let insertResult = await supabaseAdmin
      .from('intake_forms')
      .insert([fullPayload])
      .select()
      .single();

    // Retry without the migration-gated columns if they don't exist yet
    if (insertResult.error && (insertResult.error.message.includes('column') || insertResult.error.code === '42703')) {
      const basePayload = { ...rest, user_id: userId };
      insertResult = await supabaseAdmin
        .from('intake_forms')
        .insert([basePayload])
        .select()
        .single();
    }

    const { data, error } = insertResult;
    if (error) throw new Error(`Intake form insert failed: ${error.message} (code: ${error.code})`);

    // Auto-create an event from the intake form so it appears on the owner's calendar
    // and can be linked to estimates/invoices immediately without manual conversion.
    try {
      // Guard: skip if an event already exists for this intake form (prevents duplicates on re-submit)
      const { data: existingEvent } = await supabaseAdmin
        .from('event')
        .select('id')
        .eq('intake_form_id', data.id)
        .maybeSingle();
      if (existingEvent) {
        data.event_id = existingEvent.id;
      } else {
        // Look up the owner's primary venue so the event is linked and always
        // visible even when the events page filters by venue.
        const ownerVenueId = await this.resolveOwnerVenueId(userId, supabaseAdmin);

        const eventData = {
          name: data.event_name || `${data.event_type ? data.event_type.charAt(0).toUpperCase() + data.event_type.slice(1).replace(/_/g, ' ') : 'Event'} - ${data.contact_name}`,
          date: data.event_date,
          start_time: data.event_time || '00:00',
          end_time: data.event_end_time || '23:59',
          description: data.special_requests || '',
          status: 'scheduled',
          guest_count: data.guest_count || null,
          venue: 'TBD',
          owner_id: userId,
          intake_form_id: data.id,
          ...(ownerVenueId ? { venue_id: ownerVenueId } : {}),
        };
        const { data: createdEvent } = await supabaseAdmin
          .from('event')
          .insert([eventData])
          .select('id')
          .single();
        if (createdEvent) {
          // Store the event_id back on the intake form for easy cross-reference
          await supabaseAdmin
            .from('intake_forms')
            .update({ event_id: createdEvent.id })
            .eq('id', data.id);
          data.event_id = createdEvent.id;
        }
      }
    } catch (eventErr) {
      // Non-fatal — intake form was saved, event creation failed silently
      console.warn('[IntakeFormsService] Auto-event creation failed:', eventErr);
    }

    // Send invitation email to client if contact_email is present
    // NOTE: Email/SMS invitations are intentionally NOT sent here.
    // They are sent when the owner activates the lead via convertToBooking().

    // Notify the owner via SMS that a new intake form was submitted
    try {
      const { data: ownerUser } = await supabaseAdmin
        .from('users')
        .select('phone_number')
        .eq('id', userId)
        .maybeSingle();
      if (ownerUser?.phone_number) {
        const ownerPhone = normalizePhone(ownerUser.phone_number);
        await this.smsNotifications.newIntakeFormSubmission(
          ownerPhone,
          data.contact_name || 'Unknown',
          data.event_type || 'Event',
          data.event_date || 'TBD',
        );
      }
    } catch (ownerSmsErr) {
      console.warn('[IntakeFormsService] Owner SMS notification failed:', ownerSmsErr);
    }

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
        const clientName = form.contact_name || 'there';
        const eventLabel = form.event_name || form.event_type || 'your event';
        await this.twilioService.sendSMS(
          form.contact_phone,
          `Hi ${clientName}! Your event (${eventLabel}) has been scheduled. Tap the link to access your client portal and review your event details: ${inviteUrl}`,
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

    // Reuse the event auto-created when the intake form was saved (linked via intake_form_id).
    // Only create a new event if one doesn't already exist for this intake form, to prevent duplicates.
    let event: any;
    const { data: existingEvent } = await supabaseAdmin
      .from('event')
      .select('*')
      .eq('intake_form_id', intakeFormId)
      .maybeSingle();

    if (existingEvent) {
      // Update the existing event to ensure it's in scheduled state with latest guest count
      const { data: updatedEvent } = await supabaseAdmin
        .from('event')
        .update({
          status: 'scheduled',
          guest_count: intakeForm.guest_count || existingEvent.guest_count,
        })
        .eq('id', existingEvent.id)
        .select()
        .single();
      event = updatedEvent || existingEvent;
    } else {
      // No event exists yet — create one and link it to the intake form
      const ownerVenueId = await this.resolveOwnerVenueId(userId, supabaseAdmin);
      const eventData = {
        name: intakeForm.event_name || `${intakeForm.event_type ? intakeForm.event_type.charAt(0).toUpperCase() + intakeForm.event_type.slice(1).replace(/_/g, ' ') : 'Event'} - ${intakeForm.contact_name}`,
        date: intakeForm.event_date,
        start_time: intakeForm.event_time || '00:00',
        end_time: intakeForm.event_end_time || '23:59',
        description: intakeForm.special_requests || '',
        status: 'scheduled' as const,
        guest_count: intakeForm.guest_count,
        venue: 'TBD',
        owner_id: userId,
        intake_form_id: intakeFormId,
        ...(ownerVenueId ? { venue_id: ownerVenueId } : {}),
      };

      const { data: createdEvent, error: eventError } = await supabaseAdmin
        .from('event')
        .insert([eventData])
        .select()
        .single();

      if (eventError) throw eventError;
      event = createdEvent;
    }

    // Guard: event is already a booking (deposit paid) — just mark intake form converted.
    if (event.client_status === 'deposit_paid' || event.client_status === 'completed' || Number(event.deposit_amount ?? 0) > 0) {
      await supabase
        .from('intake_forms')
        .update({ status: 'converted' })
        .eq('id', intakeFormId)
        .eq('user_id', userId);

      return {
        booking: event,
        event,
        message: 'Successfully linked to existing booking',
      };
    }

    // "Convert" = update the event with client contact info and mark as pending confirmation
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('event')
      .update({
        special_requests: [
          intakeForm.special_requests,
          intakeForm.catering_requirements ? `Catering: ${intakeForm.catering_requirements}` : null,
          intakeForm.equipment_needs ? `Equipment: ${intakeForm.equipment_needs}` : null,
          intakeForm.dietary_restrictions ? `Dietary: ${intakeForm.dietary_restrictions}` : null,
          intakeForm.accessibility_requirements ? `Accessibility: ${intakeForm.accessibility_requirements}` : null,
        ].filter(Boolean).join('\n'),
        notes: `Converted from intake form. Budget range: ${intakeForm.budget_range || 'Not specified'}`,
        client_status: 'pending',
        client_confirmation_status: intakeForm.contact_phone ? 'pending' : null,
      })
      .eq('id', event.id)
      .select('*')
      .single();

    if (bookingError) throw bookingError;

    // Update intake form status to 'converted'
    await supabase
      .from('intake_forms')
      .update({ status: 'converted' })
      .eq('id', intakeFormId)
      .eq('user_id', userId);

    // Send invitation email + SMS now that the lead has been activated
    let ownerName: string | undefined;
    let venueName: string | undefined;
    try {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      if (owner) ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
    } catch { /* ignore */ }

    // Try to fetch the business/venue name from owner_accounts
    try {
      const { data: ownerAcct } = await supabaseAdmin
        .from('owner_accounts')
        .select('business_name')
        .eq('primary_owner_id', userId)
        .maybeSingle();
      if (ownerAcct?.business_name) venueName = ownerAcct.business_name;
      else {
        // Fallback: find via memberships
        const { data: membership } = await supabaseAdmin
          .from('memberships')
          .select('owner_account_id, owner_accounts(business_name)')
          .eq('user_id', userId)
          .eq('role', 'owner')
          .limit(1)
          .maybeSingle();
        const bizName = (membership as any)?.owner_accounts?.business_name;
        if (bizName) venueName = bizName;
      }
    } catch { /* ignore */ }

    if (intakeForm.contact_email && intakeForm.invite_token) {
      try {
        await this.mailService.sendClientInvitation({
          clientName: intakeForm.contact_name || 'Valued Client',
          clientEmail: intakeForm.contact_email,
          inviteToken: intakeForm.invite_token,
          eventType: intakeForm.event_type || 'Event',
          eventDate: intakeForm.event_date,
          eventTime: intakeForm.event_time ?? null,
          guestCount: intakeForm.guest_count ?? null,
          ownerName,
          venueName,
        });
        await supabaseAdmin
          .from('intake_forms')
          .update({ invite_sent_at: new Date().toISOString(), invite_status: 'sent' })
          .eq('id', intakeFormId);
      } catch (emailErr) {
        console.warn('[convertToBooking] Email invitation failed:', emailErr);
      }
    }

    if (intakeForm.contact_phone && intakeForm.invite_token) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const inviteUrl = `${frontendUrl}/invite?token=${intakeForm.invite_token}`;
        const clientName = intakeForm.contact_name || 'there';
        const eventLabel = intakeForm.event_name || intakeForm.event_type || 'your event';
        await this.twilioService.sendSMS(
          normalizePhone(intakeForm.contact_phone),
          `Hi ${clientName}! Your event (${eventLabel}) has been confirmed. Tap the link to access your client portal: ${inviteUrl}`,
        );
      } catch (smsErr) {
        console.warn('[convertToBooking] SMS invite failed:', smsErr);
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

  /**
   * Recreate an event from an intake form if it was deleted.
   * Links the newly created event back to the intake form via intake_form_id.
   */
  async recreateEvent(supabase: SupabaseClient, userId: string, intakeFormId: string) {
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

    // Check if an event already exists
    const { data: existingEvent } = await supabaseAdmin
      .from('event')
      .select('id')
      .eq('intake_form_id', intakeFormId)
      .maybeSingle();

    if (existingEvent) {
      return {
        event: existingEvent,
        message: 'Event already exists for this intake form',
      };
    }

    // Create the event using the same logic as convertToBooking
    const ownerVenueId = await this.resolveOwnerVenueId(userId, supabaseAdmin);
    const eventData = {
      name: intakeForm.event_name || `${intakeForm.event_type ? intakeForm.event_type.charAt(0).toUpperCase() + intakeForm.event_type.slice(1).replace(/_/g, ' ') : 'Event'} - ${intakeForm.contact_name}`,
      date: intakeForm.event_date,
      start_time: intakeForm.event_time || '00:00',
      end_time: intakeForm.event_end_time || '23:59',
      description: intakeForm.special_requests || '',
      status: 'scheduled' as const,
      guest_count: intakeForm.guest_count || null,
      venue: 'TBD',
      owner_id: userId,
      intake_form_id: intakeFormId,
      ...(ownerVenueId ? { venue_id: ownerVenueId } : {}),
    };

    const { data: createdEvent, error: eventError } = await supabaseAdmin
      .from('event')
      .insert([eventData])
      .select()
      .single();

    if (eventError) throw eventError;

    // Update the intake form with the new event_id
    await supabaseAdmin
      .from('intake_forms')
      .update({ event_id: createdEvent.id })
      .eq('id', intakeFormId);

    return {
      event: createdEvent,
      message: 'Event recreated successfully',
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
    // Strip columns not in intake_forms schema; venue_id is handled separately
    const { accessibility_requirements, preferred_contact, venue_id, ...safeDto } = dto;
    const venueId: string | null = venue_id || null;

    if (safeDto.contact_phone) {
      safeDto.contact_phone = normalizePhone(safeDto.contact_phone);
    }

    // Try inserting with venue_id first (requires migration); fall back without it
    let data: any;
    const withVenue = venueId ? { ...safeDto, venue_id: venueId, user_id: ownerId } : { ...safeDto, user_id: ownerId };
    const { data: d1, error: e1 } = await supabaseAdmin
      .from('intake_forms')
      .insert([withVenue])
      .select()
      .single();

    if (e1) {
      if (venueId && (e1.code === 'PGRST204' || e1.message?.includes('venue_id'))) {
        // venue_id column doesn't exist yet — insert without it
        const { data: d2, error: e2 } = await supabaseAdmin
          .from('intake_forms')
          .insert([{ ...safeDto, user_id: ownerId }])
          .select()
          .single();
        if (e2) throw new Error(`Public intake form insert failed: ${e2.message}`);
        data = d2;
      } else {
        throw new Error(`Public intake form insert failed: ${e1.message}`);
      }
    } else {
      data = d1;
    }
    await this.autoCreateEvent(data, ownerId, venueId);

    // Notify the owner via SMS + email
    try {
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('phone_number, email')
        .eq('id', ownerId)
        .maybeSingle();
      const ownerPhone = (owner as any)?.phone_number ?? null;
      const ownerEmail = (owner as any)?.email ?? null;
      const eventDate = safeDto.event_date
        ? new Date(safeDto.event_date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })
        : 'TBD';

      // SMS
      await this.smsNotifications.newIntakeFormSubmission(
        ownerPhone,
        safeDto.contact_name || 'A client',
        safeDto.event_type || 'event',
        eventDate,
      );

      // Email
      if (ownerEmail) {
        await this.mailService.sendNewLeadNotification({
          ownerEmail,
          clientName: safeDto.contact_name || 'A client',
          eventType: safeDto.event_type || 'event',
          eventDate,
          clientEmail: safeDto.contact_email || '',
          clientPhone: safeDto.contact_phone || null,
          budget: safeDto.budget_range || null,
          guestCount: safeDto.guest_count || null,
        });
      }
    } catch (smsErr) {
      console.warn('[IntakeFormsService.createPublic] Owner notification failed:', smsErr);
    }

    return data;
  }
}

