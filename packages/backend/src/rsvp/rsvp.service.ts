import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { MailService } from '../mail/mail.service';

function phoneLastFour(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4);
}

function buildPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return [...new Set([phone, last10, `1${last10}`, `+1${last10}`])].filter(Boolean);
}

@Injectable()
export class RsvpService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly mailService: MailService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Verify client phone matches intake form and return the form. */
  private async verifyClientOwnsForm(intakeFormId: string, clientPhone: string): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data: form } = await admin
      .from('intake_forms')
      .select('id, user_id, contact_name, contact_phone, event_id')
      .eq('id', intakeFormId)
      .single();
    if (!form) throw new NotFoundException('Event not found');

    const variants = buildPhoneVariants(clientPhone);
    const storedVariants = buildPhoneVariants(form.contact_phone ?? '');
    const match = variants.some(v => storedVariants.includes(v));
    if (!match) throw new UnauthorizedException('You are not authorised to manage this event');
    return form;
  }

  // ── Client-portal methods (authenticated) ────────────────────────────────

  /** List RSVP-able events for a client (events they have intake forms for). */
  async getEventsForClient(clientPhone: string): Promise<any[]> {
    const admin = this.supabaseService.getAdminClient();
    const variants = buildPhoneVariants(clientPhone);
    const results = await Promise.all(
      variants.map(v => admin.from('intake_forms').select('id, user_id, contact_name, event_id').eq('contact_phone', v)),
    );
    const forms = [...new Map(
      results.flatMap(r => r.data || []).map((f: any) => [f.id, f])
    ).values()];

    if (!forms.length) return [];

    const eventIds = forms.map((f: any) => f.event_id).filter(Boolean);
    const intakeIds = forms.map((f: any) => f.id);

    const [eventsRes, countRes] = await Promise.all([
      eventIds.length
        ? admin.from('event').select('id, name, date, intake_form_id').in('id', eventIds)
        : { data: [] },
      admin.from('rsvp_guests').select('intake_form_id, status, plus_ones').in('intake_form_id', intakeIds),
    ]);

    // Build summary per intake form
    const guestRows: any[] = countRes.data || [];
    const summary: Record<string, { total: number; attending: number; declined: number; pending: number; headcount: number }> = {};
    for (const row of guestRows) {
      const id = row.intake_form_id;
      if (!summary[id]) summary[id] = { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 };
      summary[id].total++;
      if (row.status === 'attending') {
        summary[id].attending++;
        summary[id].headcount += 1 + (row.plus_ones ?? 0);
      } else if (row.status === 'declined') summary[id].declined++;
      else summary[id].pending++;
    }

    return forms.map((form: any) => {
      const event = (eventsRes.data || []).find((e: any) => e.id === form.event_id);
      return {
        intake_form_id: form.id,
        contact_name: form.contact_name,
        event_id: form.event_id,
        event_name: event?.name ?? null,
        event_date: event?.date ?? null,
        rsvp_summary: summary[form.id] ?? { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 },
      };
    });
  }

  /** List all RSVP guests for an event. */
  async getGuests(intakeFormId: string, clientPhone: string): Promise<any[]> {
    await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('rsvp_guests')
      .select('id, rsvp_token, guest_name, guest_phone, guest_email, status, plus_ones, meal_preference, table_assignment, responded_at, sms_sent_at, created_at')
      .eq('intake_form_id', intakeFormId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /** Add a single RSVP guest. */
  async addGuest(intakeFormId: string, clientPhone: string, guestData: {
    guest_name: string; guest_phone?: string; guest_email?: string; table_assignment?: string;
  }): Promise<any> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    if (!guestData.guest_name?.trim()) throw new BadRequestException('guest_name is required');

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('rsvp_guests')
      .insert({
        intake_form_id: intakeFormId,
        owner_id: form.user_id,
        guest_name: guestData.guest_name.trim(),
        guest_phone: guestData.guest_phone?.trim() || null,
        guest_email: guestData.guest_email?.trim() || null,
        table_assignment: guestData.table_assignment?.trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Bulk add guests (array of names + optional phone). */
  async bulkAddGuests(intakeFormId: string, clientPhone: string, guests: Array<{
    guest_name: string; guest_phone?: string; guest_email?: string; table_assignment?: string;
  }>): Promise<any[]> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    if (!guests.length) return [];

    const admin = this.supabaseService.getAdminClient();
    const rows = guests.map(g => ({
      intake_form_id: intakeFormId,
      owner_id: form.user_id,
      guest_name: g.guest_name.trim(),
      guest_phone: g.guest_phone?.trim() || null,
      guest_email: g.guest_email?.trim() || null,
      table_assignment: g.table_assignment?.trim() || null,
    })).filter(g => g.guest_name);

    const { data, error } = await admin.from('rsvp_guests').insert(rows).select();
    if (error) throw error;
    return data || [];
  }

  /** Update a guest (table assignment, etc.) */
  async updateGuest(guestId: string, intakeFormId: string, clientPhone: string, updates: Partial<{
    guest_name: string; guest_phone: string; guest_email: string; table_assignment: string;
  }>): Promise<any> {
    await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('rsvp_guests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', guestId)
      .eq('intake_form_id', intakeFormId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Delete a guest. */
  async deleteGuest(guestId: string, intakeFormId: string, clientPhone: string): Promise<void> {
    await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin
      .from('rsvp_guests')
      .delete()
      .eq('id', guestId)
      .eq('intake_form_id', intakeFormId);
    if (error) throw error;
  }

  /** Send RSVP invite link to a single guest via SMS (and email if available). */
  async sendInvite(guestId: string, intakeFormId: string, clientPhone: string): Promise<any> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();

    const { data: guest } = await admin
      .from('rsvp_guests').select('*').eq('id', guestId).eq('intake_form_id', intakeFormId).single();
    if (!guest) throw new NotFoundException('Guest not found');

    await this.doSendInvite(guest, form);

    const { data, error } = await admin
      .from('rsvp_guests')
      .update({ sms_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', guestId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Send RSVP invites to all guests that haven't been sent one yet. */
  async sendAllInvites(intakeFormId: string, clientPhone: string): Promise<{ sent: number; skipped: number }> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();

    const { data: guests } = await admin
      .from('rsvp_guests')
      .select('*')
      .eq('intake_form_id', intakeFormId)
      .is('sms_sent_at', null);

    if (!guests?.length) return { sent: 0, skipped: 0 };

    let sent = 0;
    let skipped = 0;

    for (const guest of guests) {
      if (!guest.guest_phone && !guest.guest_email) { skipped++; continue; }
      try {
        await this.doSendInvite(guest, form);
        await admin
          .from('rsvp_guests')
          .update({ sms_sent_at: new Date().toISOString() })
          .eq('id', guest.id);
        sent++;
      } catch { skipped++; }
    }

    return { sent, skipped };
  }

  private async doSendInvite(guest: any, form: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const rsvpUrl = `${frontendUrl}/rsvp/${guest.rsvp_token}`;

    // Get event info for nicer message
    const admin = this.supabaseService.getAdminClient();
    let eventName = 'the event';
    let eventDate = '';
    if (form.event_id) {
      const { data: ev } = await admin.from('event').select('name, date').eq('id', form.event_id).single();
      if (ev) {
        eventName = ev.name ?? eventName;
        if (ev.date) {
          eventDate = ` on ${new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }
      }
    }

    const message = `Hi ${guest.guest_name}! You're invited to ${eventName}${eventDate}. Please RSVP here: ${rsvpUrl}`;

    if (guest.guest_phone) {
      await this.smsNotifications.trySend(guest.guest_phone, message);
    }

    if (guest.guest_email) {
      await this.mailService.sendContractWithResend({
        clientName: guest.guest_name,
        clientEmail: guest.guest_email,
        ownerName: form.contact_name || 'Your Host',
        contractNumber: '',
        contractTitle: `RSVP: ${eventName}${eventDate}`,
        contractUrl: rsvpUrl,
      }).catch(() => {});
    }
  }

  // ── Invitation images (client-portal) ────────────────────────────────────

  /** Get invitation images for an event. */
  async getInvitationImages(intakeFormId: string, clientPhone: string): Promise<string[]> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    let eventData: any = null;
    if (form.event_id) {
      const { data } = await admin.from('event').select('management_data').eq('id', form.event_id).single();
      eventData = data;
    }
    if (!eventData) {
      // Fallback: find event by intake_form_id (handles older forms without event_id set)
      const { data } = await admin.from('event').select('management_data').eq('intake_form_id', intakeFormId).maybeSingle();
      eventData = data;
    }
    return (eventData as any)?.management_data?.invitationImages ?? [];
  }

  /** Set invitation images for an event (replaces existing list). */
  async setInvitationImages(intakeFormId: string, clientPhone: string, images: string[]): Promise<string[]> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    // Resolve the event (prefer form.event_id, fallback to event.intake_form_id)
    let targetEventId: string | null = form.event_id ?? null;
    let existingMgmt: any = {};
    if (targetEventId) {
      const { data } = await admin.from('event').select('id, management_data').eq('id', targetEventId).single();
      existingMgmt = (data as any)?.management_data ?? {};
    } else {
      const { data } = await admin.from('event').select('id, management_data').eq('intake_form_id', intakeFormId).maybeSingle();
      if (!data) throw new NotFoundException('No linked event found');
      targetEventId = data.id;
      existingMgmt = (data as any)?.management_data ?? {};
    }
    await admin.from('event').update({
      management_data: { ...existingMgmt, invitationImages: images.slice(0, 2) },
    }).eq('id', targetEventId);
    return images.slice(0, 2);
  }

  // ── Public methods (no auth — token-gated) ────────────────────────────────

  /** Get public invite details (for guest to view before responding). */
  async getPublicInvite(token: string): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data: guest } = await admin
      .from('rsvp_guests')
      .select('id, guest_name, status, plus_ones, meal_preference, table_assignment, responded_at, guest_phone, intake_form_id')
      .eq('rsvp_token', token)
      .single();
    if (!guest) throw new NotFoundException('RSVP link not found or expired');

    // Get event details
    let event: any = null;
    const { data: form } = await admin
      .from('intake_forms')
      .select('event_id, contact_name, event_type, event_date')
      .eq('id', guest.intake_form_id)
      .single();

    if (form?.event_id) {
      const { data: ev } = await admin.from('event').select('name, date, start_time, venue, management_data').eq('id', form.event_id).single();
      event = ev;
    }
    if (!event && guest.intake_form_id) {
      // Fallback: find event by intake_form_id (handles older forms without event_id set)
      const { data: ev } = await admin.from('event').select('name, date, start_time, venue, management_data').eq('intake_form_id', guest.intake_form_id).maybeSingle();
      event = ev;
    }

    return {
      guest_name: guest.guest_name,
      status: guest.status,
      plus_ones: guest.plus_ones,
      meal_preference: guest.meal_preference,
      table_assignment: guest.table_assignment,
      responded_at: guest.responded_at,
      // Only indicate whether phone verification is required (don't expose the phone)
      requires_phone_verify: !!guest.guest_phone,
      invitation_images: (event as any)?.management_data?.invitationImages ?? [],
      event: {
        name: event?.name ?? null,
        date: event?.date ?? form?.event_date ?? null,
        start_time: event?.start_time ?? null,
        venue: event?.venue ?? null,
        host_name: form?.contact_name ?? 'Your Host',
        event_type: form?.event_type ?? null,
      },
    };
  }

  /** Verify phone last 4 + submit RSVP response. */
  async respondToInvite(
    token: string,
    phoneLastFourInput: string | undefined,
    response: {
      status: 'attending' | 'declined';
      plus_ones?: number;
      meal_preference?: string;
      sms_opt_in?: boolean;
    },
  ): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data: guest } = await admin
      .from('rsvp_guests')
      .select('*')
      .eq('rsvp_token', token)
      .single();
    if (!guest) throw new NotFoundException('RSVP link not found');

    // Phone verification if a phone was stored
    if (guest.guest_phone) {
      if (!phoneLastFourInput) throw new BadRequestException('Please enter the last 4 digits of your phone number to verify your identity.');
      const storedLast4 = phoneLastFour(guest.guest_phone);
      if (storedLast4 !== phoneLastFourInput.trim().replace(/\D/g, '').slice(-4)) {
        throw new UnauthorizedException('Phone number does not match our records. Please check and try again.');
      }
    }

    if (!['attending', 'declined'].includes(response.status)) {
      throw new BadRequestException('status must be attending or declined');
    }

    const { data, error } = await admin
      .from('rsvp_guests')
      .update({
        status: response.status,
        plus_ones: response.status === 'attending' ? (response.plus_ones ?? 0) : 0,
        meal_preference: response.status === 'attending' ? (response.meal_preference || 'standard') : guest.meal_preference,
        sms_opt_in: response.status === 'attending' ? (response.sms_opt_in ?? false) : false,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('rsvp_token', token)
      .select()
      .single();
    if (error) throw error;

    // Notify owner via SMS
    try {
      const { data: form } = await admin
        .from('intake_forms')
        .select('contact_phone, user_id')
        .eq('id', guest.intake_form_id)
        .single();
      if (form?.contact_phone) {
        const action = response.status === 'attending' ? '✅ will be attending' : '❌ has declined';
        await this.smsNotifications.trySend(
          form.contact_phone,
          `RSVP update: ${guest.guest_name} ${action}${response.plus_ones ? ` (+${response.plus_ones})` : ''}.`,
        );
      }
    } catch { /* non-fatal */ }

    return { success: true, status: data.status };
  }
}
