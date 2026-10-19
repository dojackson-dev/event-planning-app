import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { MailService } from '../mail/mail.service';
import { GuestListsService } from '../guest-lists/guest-lists.service';
import {
  describeDuplicate,
  findDuplicateGuest,
  sharedContact,
} from './rsvp-duplicates';
import type { GuestContact } from './rsvp-duplicates';

export type RsvpActor = string | { ownerId: string };

export interface BulkAddResult {
  added: any[];
  skipped: Array<{ guest_name: string; reason: string }>;
}

function phoneLastFour(phone: string): string {
  return phone.replace(/\D/g, '').slice(-4);
}

function buildPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return [...new Set([phone, last10, `1${last10}`, `+1${last10}`])].filter(
    Boolean,
  );
}

@Injectable()
export class RsvpService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly mailService: MailService,
    private readonly guestListsService: GuestListsService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Verify client phone matches intake form and return the form. */
  private async verifyClientOwnsForm(
    intakeFormId: string,
    clientPhone: RsvpActor,
  ): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data: form } = await admin
      .from('intake_forms')
      .select('id, user_id, contact_name, contact_phone, event_id')
      .eq('id', intakeFormId)
      .single();
    if (!form) throw new NotFoundException('Event not found');

    if (typeof clientPhone !== 'string') {
      const event = await this.findEventForForm(form);
      if (!event || event.owner_id !== clientPhone.ownerId) {
        throw new NotFoundException('Event not found');
      }
      return form;
    }

    const variants = buildPhoneVariants(clientPhone);
    const storedVariants = buildPhoneVariants(form.contact_phone ?? '');
    const match = variants.some((v) => storedVariants.includes(v));
    if (!match && !(await this.hasSharedEventAccess(form, variants)))
      throw new UnauthorizedException(
        'You are not authorised to manage this event',
      );
    return form;
  }

  /** Same access rules as the client portal's My Events: team member or invoice contact. */
  private async hasSharedEventAccess(
    form: { id: string; event_id?: string | number | null },
    variants: string[],
  ): Promise<boolean> {
    const admin = this.supabaseService.getAdminClient();
    const { data: events, error } = await admin
      .from('event')
      .select('id')
      .or(`intake_form_id.eq.${form.id},client_id.eq.${form.id}`);
    if (error) throw error;
    const eventIds = [
      ...new Set(
        [form.event_id, ...(events || []).map((e: any) => e.id)].filter(
          Boolean,
        ),
      ),
    ];
    if (!eventIds.length) return false;

    const [team, invoices] = await Promise.all([
      admin
        .from('event_team_members')
        .select('id')
        .in('event_id', eventIds)
        .in('phone', variants)
        .limit(1),
      admin
        .from('invoices')
        .select('id')
        .in('event_id', eventIds)
        .in('client_phone', variants)
        .limit(1),
    ]);
    if (team.error) throw team.error;
    if (invoices.error) throw invoices.error;
    return Boolean(team.data?.length || invoices.data?.length);
  }

  /** Intake forms for events this phone reached as a team member or invoice contact. */
  private async findSharedEventForms(variants: string[]): Promise<any[]> {
    const admin = this.supabaseService.getAdminClient();
    const [team, invoices] = await Promise.all([
      admin.from('event_team_members').select('event_id').in('phone', variants),
      admin
        .from('invoices')
        .select('event_id')
        .in('client_phone', variants)
        .not('event_id', 'is', null),
    ]);
    if (team.error) throw team.error;
    if (invoices.error) throw invoices.error;
    const eventIds = [
      ...new Set(
        [...(team.data || []), ...(invoices.data || [])]
          .map((row: any) => row.event_id)
          .filter(Boolean),
      ),
    ];
    if (!eventIds.length) return [];

    const { data: events, error: eventsError } = await admin
      .from('event')
      .select('id, intake_form_id')
      .in('id', eventIds)
      .not('intake_form_id', 'is', null);
    if (eventsError) throw eventsError;
    if (!events?.length) return [];

    const { data: forms, error: formsError } = await admin
      .from('intake_forms')
      .select('id, user_id, contact_name, event_id')
      .in(
        'id',
        events.map((e: any) => e.intake_form_id),
      );
    if (formsError) throw formsError;
    const eventByForm = new Map(
      events.map((e: any) => [e.intake_form_id, e.id]),
    );
    return (forms || []).map((f: any) => ({
      ...f,
      event_id: f.event_id ?? eventByForm.get(f.id) ?? null,
    }));
  }

  private async findEventForForm(form: {
    id: string;
    event_id?: string | number | null;
  }): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const query = admin
      .from('event')
      .select('id, owner_id, name, date, start_time, venue, management_data');
    const { data, error } = await (
      form.event_id
        ? query.eq('id', form.event_id)
        : query.or(`intake_form_id.eq.${form.id},client_id.eq.${form.id}`)
    ).maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Contact details of every guest already on this event's list, used to exclude duplicates. */
  private async loadGuestContacts(
    intakeFormId: string,
  ): Promise<Array<GuestContact & { id: string }>> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('rsvp_guests')
      .select('id, guest_name, guest_phone, guest_email')
      .eq('intake_form_id', intakeFormId);
    if (error) throw error;
    return data || [];
  }

  private async syncGuestForForm(
    form: { id: string; event_id?: string | number | null },
    guest: any,
  ): Promise<void> {
    const event = await this.findEventForForm(form);
    if (event) await this.guestListsService.syncRsvpGuest(event.id, guest);
  }

  // ── Client-portal methods (authenticated) ────────────────────────────────

  /** List RSVP-able events for a client (events they have intake forms for). */
  async getEventsForClient(clientPhone: RsvpActor): Promise<any[]> {
    const admin = this.supabaseService.getAdminClient();
    const results =
      typeof clientPhone !== 'string'
        ? [
            await admin
              .from('intake_forms')
              .select('id, user_id, contact_name, event_id')
              .eq('user_id', clientPhone.ownerId),
          ]
        : await Promise.all(
            buildPhoneVariants(clientPhone).map((v) =>
              admin
                .from('intake_forms')
                .select('id, user_id, contact_name, event_id')
                .eq('contact_phone', v),
            ),
          );
    for (const result of results) {
      if (result.error) throw result.error;
    }
    const formsById = new Map<string, any>(
      results.flatMap((r) => r.data || []).map((f: any) => [f.id, f]),
    );
    if (typeof clientPhone === 'string') {
      for (const shared of await this.findSharedEventForms(
        buildPhoneVariants(clientPhone),
      )) {
        const own = formsById.get(shared.id);
        if (!own) formsById.set(shared.id, shared);
        else if (!own.event_id) own.event_id = shared.event_id;
      }
    }
    const forms = [...formsById.values()];

    if (!forms.length) return [];

    const intakeIds = forms.map((f: any) => f.id);

    const [eventsRes, countRes] = await Promise.all([
      Promise.all(forms.map((form: any) => this.findEventForForm(form))),
      admin
        .from('rsvp_guests')
        .select('intake_form_id, status, plus_ones')
        .in('intake_form_id', intakeIds),
    ]);
    if (countRes.error) throw countRes.error;

    // Build summary per intake form
    const guestRows: any[] = countRes.data || [];
    const summary: Record<
      string,
      {
        total: number;
        attending: number;
        declined: number;
        pending: number;
        headcount: number;
      }
    > = {};
    for (const row of guestRows) {
      const id = row.intake_form_id;
      if (!summary[id])
        summary[id] = {
          total: 0,
          attending: 0,
          declined: 0,
          pending: 0,
          headcount: 0,
        };
      summary[id].total++;
      if (row.status === 'attending') {
        summary[id].attending++;
        summary[id].headcount += 1 + (row.plus_ones ?? 0);
      } else if (row.status === 'declined') summary[id].declined++;
      else summary[id].pending++;
    }

    return forms
      .map((form: any, index: number) => {
        const event = eventsRes[index];
        if (
          typeof clientPhone !== 'string' &&
          event?.owner_id !== clientPhone.ownerId
        )
          return null;
        return {
          intake_form_id: form.id,
          contact_name: form.contact_name,
          event_id: event?.id ?? null,
          event_name: event?.name ?? null,
          event_date: event?.date ?? null,
          rsvp_summary: summary[form.id] ?? {
            total: 0,
            attending: 0,
            declined: 0,
            pending: 0,
            headcount: 0,
          },
        };
      })
      .filter(Boolean);
  }

  /**
   * List all RSVP guests for an event, including live arrival/check-in
   * status from the venue owner's Door List (so the client sees the same
   * status the owner sees for each guest).
   */
  async getGuests(
    intakeFormId: string,
    clientPhone: RsvpActor,
  ): Promise<any[]> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('rsvp_guests')
      .select(
        'id, rsvp_token, guest_name, guest_phone, guest_email, status, plus_ones, meal_preference, table_assignment, responded_at, sms_sent_at, created_at',
      )
      .eq('intake_form_id', intakeFormId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const guests = data || [];
    if (!guests.length) return guests;
    const event = await this.findEventForForm(form);
    if (event) {
      for (const guest of guests) {
        await this.guestListsService.syncRsvpGuest(event.id, guest);
      }
    }

    const { data: doorListRows, error: arrivalError } = await admin
      .from('guests')
      .select('rsvp_guest_id, has_arrived, arrived_at')
      .in(
        'rsvp_guest_id',
        guests.map((g: any) => g.id),
      );
    if (arrivalError) throw arrivalError;
    const arrivalByRsvpId = new Map(
      (doorListRows || []).map((r: any) => [r.rsvp_guest_id, r]),
    );
    return guests.map((g: any) => ({
      ...g,
      has_arrived: arrivalByRsvpId.get(g.id)?.has_arrived ?? false,
      arrived_at: arrivalByRsvpId.get(g.id)?.arrived_at ?? null,
    }));
  }

  /** Add a single RSVP guest. */
  async addGuest(
    intakeFormId: string,
    clientPhone: RsvpActor,
    guestData: {
      guest_name: string;
      guest_phone?: string;
      guest_email?: string;
      table_assignment?: string;
    },
  ): Promise<any> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    if (!guestData.guest_name?.trim())
      throw new BadRequestException('guest_name is required');

    const duplicate = findDuplicateGuest(
      guestData,
      await this.loadGuestContacts(intakeFormId),
    );
    if (duplicate) {
      throw new ConflictException(
        `${duplicate.match.guest_name} is already on the guest list (${describeDuplicate(duplicate.reason)}).`,
      );
    }

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

  /** Bulk add guests (array of names + optional phone). Returns only the guests that were created. */
  async bulkAddGuests(
    intakeFormId: string,
    clientPhone: RsvpActor,
    guests: Array<{
      guest_name: string;
      guest_phone?: string;
      guest_email?: string;
      table_assignment?: string;
    }>,
  ): Promise<any[]> {
    return (await this.bulkAddGuestsDetailed(intakeFormId, clientPhone, guests))
      .added;
  }

  /** Like bulkAddGuests, but also reports each guest skipped as a duplicate of the list or of an earlier row. */
  async bulkAddGuestsDetailed(
    intakeFormId: string,
    clientPhone: RsvpActor,
    guests: Array<{
      guest_name: string;
      guest_phone?: string;
      guest_email?: string;
      table_assignment?: string;
    }>,
  ): Promise<BulkAddResult> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    if (!guests.length) return { added: [], skipped: [] };

    const admin = this.supabaseService.getAdminClient();
    const known: GuestContact[] = await this.loadGuestContacts(intakeFormId);
    const rows: Array<Record<string, string | null>> = [];
    const skipped: BulkAddResult['skipped'] = [];
    for (const g of guests) {
      const guest_name =
        typeof g?.guest_name === 'string' ? g.guest_name.trim() : '';
      if (!guest_name) continue;
      const row = {
        intake_form_id: intakeFormId,
        owner_id: form.user_id,
        guest_name,
        guest_phone: g.guest_phone?.trim() || null,
        guest_email: g.guest_email?.trim() || null,
        table_assignment: g.table_assignment?.trim() || null,
      };
      const duplicate = findDuplicateGuest(row, known);
      if (duplicate) {
        skipped.push({
          guest_name,
          reason: `Duplicate of ${duplicate.match.guest_name} (${describeDuplicate(duplicate.reason)})`,
        });
        continue;
      }
      known.push(row);
      rows.push(row);
    }
    if (!rows.length) return { added: [], skipped };

    const { data, error } = await admin
      .from('rsvp_guests')
      .insert(rows)
      .select();
    if (error) throw error;
    return { added: data || [], skipped };
  }

  /** Update a guest (table assignment, etc.) */
  async updateGuest(
    guestId: string,
    intakeFormId: string,
    clientPhone: RsvpActor,
    updates: Partial<{
      guest_name: string;
      guest_phone: string;
      guest_email: string;
      table_assignment: string;
    }>,
  ): Promise<any> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    const allowedUpdates: Record<string, string> = {};
    for (const field of [
      'guest_name',
      'guest_phone',
      'guest_email',
      'table_assignment',
    ] as const) {
      const value = updates[field];
      if (value === undefined) continue;
      if (typeof value !== 'string')
        throw new BadRequestException(`${field} must be a string`);
      if (field === 'guest_name' && !value.trim())
        throw new BadRequestException('guest_name is required');
      allowedUpdates[field] = value.trim();
    }

    if (
      'guest_name' in allowedUpdates ||
      'guest_phone' in allowedUpdates ||
      'guest_email' in allowedUpdates
    ) {
      const all = await this.loadGuestContacts(intakeFormId);
      const current = all.find((g) => g.id === guestId);
      if (current) {
        const duplicate = findDuplicateGuest(
          { ...current, ...allowedUpdates },
          all.filter((g) => g.id !== guestId),
        );
        if (duplicate) {
          throw new ConflictException(
            `${duplicate.match.guest_name} is already on the guest list (${describeDuplicate(duplicate.reason)}).`,
          );
        }
      }
    }
    const { data, error } = await admin
      .from('rsvp_guests')
      .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
      .eq('id', guestId)
      .eq('intake_form_id', intakeFormId)
      .select()
      .single();
    if (error) throw error;
    await this.syncGuestForForm(form, data);
    return data;
  }

  /** Delete a guest. */
  async deleteGuest(
    guestId: string,
    intakeFormId: string,
    clientPhone: RsvpActor,
  ): Promise<void> {
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
  async sendInvite(
    guestId: string,
    intakeFormId: string,
    clientPhone: RsvpActor,
  ): Promise<any> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();

    const { data: guest } = await admin
      .from('rsvp_guests')
      .select('*')
      .eq('id', guestId)
      .eq('intake_form_id', intakeFormId)
      .single();
    if (!guest) throw new NotFoundException('Guest not found');

    await this.doSendInvite(guest, form);

    const { data, error } = await admin
      .from('rsvp_guests')
      .update({
        sms_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', guestId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Send RSVP invites to all guests that haven't been sent one yet. A phone or email that was already invited is not messaged again. */
  async sendAllInvites(
    intakeFormId: string,
    clientPhone: RsvpActor,
  ): Promise<{ sent: number; skipped: number; duplicates: number }> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();

    const { data: allGuests } = await admin
      .from('rsvp_guests')
      .select('*')
      .eq('intake_form_id', intakeFormId);

    const guests = (allGuests || []).filter((g: any) => !g.sms_sent_at);
    if (!guests.length) return { sent: 0, skipped: 0, duplicates: 0 };

    const invited: GuestContact[] = (allGuests || []).filter(
      (g: any) => g.sms_sent_at,
    );
    let sent = 0;
    let skipped = 0;
    let duplicates = 0;

    for (const guest of guests) {
      if (!guest.guest_phone && !guest.guest_email) {
        skipped++;
        continue;
      }
      if (invited.some((other) => sharedContact(guest, other))) {
        duplicates++;
        continue;
      }
      try {
        await this.doSendInvite(guest, form);
        await admin
          .from('rsvp_guests')
          .update({ sms_sent_at: new Date().toISOString() })
          .eq('id', guest.id);
        invited.push(guest);
        sent++;
      } catch {
        skipped++;
      }
    }

    return { sent, skipped, duplicates };
  }

  private async doSendInvite(guest: any, form: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const rsvpUrl = `${frontendUrl}/rsvp/${guest.rsvp_token}`;

    // Get event info for nicer message
    let eventName = 'the event';
    let eventDate = '';
    const ev = await this.findEventForForm(form).catch(() => null);
    if (ev) {
      eventName = ev.name ?? eventName;
      if (ev.date) {
        eventDate = ` on ${new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      }
    }

    const message = `Hi ${guest.guest_name}! You're invited to ${eventName}${eventDate}. Please RSVP here: ${rsvpUrl}`;

    if (guest.guest_phone) {
      await this.smsNotifications.trySend(guest.guest_phone, message);
    }

    if (guest.guest_email) {
      await this.mailService
        .sendContractWithResend({
          clientName: guest.guest_name,
          clientEmail: guest.guest_email,
          ownerName: form.contact_name || 'Your Host',
          contractNumber: '',
          contractTitle: `RSVP: ${eventName}${eventDate}`,
          contractUrl: rsvpUrl,
        })
        .catch(() => {});
    }
  }

  // ── Invitation images (client-portal) ────────────────────────────────────

  /** Get invitation images for an event. */
  async getInvitationImages(
    intakeFormId: string,
    clientPhone: RsvpActor,
  ): Promise<string[]> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const eventData = await this.findEventForForm(form);
    return eventData?.management_data?.invitationImages ?? [];
  }

  /** Set invitation images for an event (replaces existing list). */
  async setInvitationImages(
    intakeFormId: string,
    clientPhone: RsvpActor,
    images: string[],
  ): Promise<string[]> {
    const form = await this.verifyClientOwnsForm(intakeFormId, clientPhone);
    const admin = this.supabaseService.getAdminClient();
    const event = await this.findEventForForm(form);
    if (!event) throw new NotFoundException('No linked event found');
    const { error } = await admin
      .from('event')
      .update({
        management_data: {
          ...(event.management_data ?? {}),
          invitationImages: images.slice(0, 2),
        },
      })
      .eq('id', event.id);
    if (error) throw error;
    return images.slice(0, 2);
  }

  // ── Public methods (no auth — token-gated) ────────────────────────────────

  /** Get public invite details (for guest to view before responding). */
  async getPublicInvite(token: string): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    const { data: guest } = await admin
      .from('rsvp_guests')
      .select(
        'id, guest_name, status, plus_ones, meal_preference, table_assignment, responded_at, guest_phone, intake_form_id',
      )
      .eq('rsvp_token', token)
      .single();
    if (!guest) throw new NotFoundException('RSVP link not found or expired');

    // Get event details
    const { data: form } = await admin
      .from('intake_forms')
      .select('id, event_id, contact_name, event_type, event_date')
      .eq('id', guest.intake_form_id)
      .single();

    const event = form ? await this.findEventForForm(form) : null;

    return {
      guest_name: guest.guest_name,
      status: guest.status,
      plus_ones: guest.plus_ones,
      meal_preference: guest.meal_preference,
      table_assignment: guest.table_assignment,
      responded_at: guest.responded_at,
      // Only indicate whether phone verification is required (don't expose the phone)
      requires_phone_verify: !!guest.guest_phone,
      invitation_images: event?.management_data?.invitationImages ?? [],
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
      if (!phoneLastFourInput)
        throw new BadRequestException(
          'Please enter the last 4 digits of your phone number to verify your identity.',
        );
      const storedLast4 = phoneLastFour(guest.guest_phone);
      if (
        storedLast4 !== phoneLastFourInput.trim().replace(/\D/g, '').slice(-4)
      ) {
        throw new UnauthorizedException(
          'Phone number does not match our records. Please check and try again.',
        );
      }
    }

    if (!['attending', 'declined'].includes(response.status)) {
      throw new BadRequestException('status must be attending or declined');
    }

    const { data, error } = await admin
      .from('rsvp_guests')
      .update({
        status: response.status,
        plus_ones:
          response.status === 'attending' ? (response.plus_ones ?? 0) : 0,
        meal_preference:
          response.status === 'attending'
            ? response.meal_preference || 'standard'
            : guest.meal_preference,
        sms_opt_in:
          response.status === 'attending'
            ? (response.sms_opt_in ?? false)
            : false,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('rsvp_token', token)
      .select()
      .single();
    if (error) throw error;

    const { data: linkedForm, error: formError } = await admin
      .from('intake_forms')
      .select('id, event_id, contact_phone')
      .eq('id', guest.intake_form_id)
      .single();
    if (formError) throw formError;
    await this.syncGuestForForm(linkedForm, data);

    // Notify owner via SMS
    try {
      if (linkedForm?.contact_phone) {
        const action =
          response.status === 'attending'
            ? '✅ will be attending'
            : '❌ has declined';
        await this.smsNotifications.trySend(
          linkedForm.contact_phone,
          `RSVP update: ${guest.guest_name} ${action}${response.plus_ones ? ` (+${response.plus_ones})` : ''}.`,
        );
      }
    } catch {
      /* non-fatal */
    }

    return { success: true, status: data.status };
  }
}
