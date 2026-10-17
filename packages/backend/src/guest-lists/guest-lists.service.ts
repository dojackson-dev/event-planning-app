import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class GuestListsService {
  constructor(
    private supabaseService: SupabaseService,
    private smsNotifications: SmsNotificationsService,
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateAccessCode(): string {
    // Generate a 6-character alphanumeric code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar characters
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  /**
   * Throws NotFoundException if the guest list doesn't exist or its event
   * isn't owned by userId. Returns the guest list row (with event_id) on success.
   * Using NotFoundException (not Forbidden) so a guessed ID doesn't confirm
   * to an attacker that the resource exists.
   */
  async assertGuestListOwnership(
    guestListId: number,
    userId: string,
  ): Promise<{ id: number; event_id: number | null }> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: guestList, error } = await supabase
      .from('guest_lists')
      .select('id, event_id')
      .eq('id', guestListId)
      .single();
    if (error || !guestList)
      throw new NotFoundException('Guest list not found');

    if (!guestList.event_id)
      throw new NotFoundException('Guest list not found');
    const { data: event } = await supabase
      .from('event')
      .select('owner_id')
      .eq('id', guestList.event_id)
      .single();
    if (!event || event.owner_id !== userId) {
      throw new NotFoundException('Guest list not found');
    }
    return guestList;
  }

  /**
   * Throws NotFoundException if the guest doesn't exist or its guest list's
   * event isn't owned by userId. Returns the guest_list_id on success.
   */
  async assertGuestOwnership(guestId: number, userId: string): Promise<number> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: guest, error } = await supabase
      .from('guests')
      .select('guest_list_id')
      .eq('id', guestId)
      .single();
    if (error || !guest) throw new NotFoundException('Guest not found');

    await this.assertGuestListOwnership(guest.guest_list_id, userId);
    return guest.guest_list_id;
  }

  /**
   * Throws NotFoundException if the event doesn't exist or isn't owned by
   * userId. Used to authorize findByEvent and create (which take a raw
   * eventId rather than a guest_lists.id).
   */
  async assertOwnsEvent(eventId: string, userId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: event, error } = await supabase
      .from('event')
      .select('owner_id')
      .eq('id', eventId)
      .single();
    if (error || !event || event.owner_id !== userId) {
      throw new NotFoundException('Event not found');
    }
  }

  async findAllForOwner(userId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    // Only events owned by this user
    const { data: ownedEvents } = await supabase
      .from('event')
      .select('id')
      .eq('owner_id', userId);
    const eventIds = (ownedEvents || []).map((e) => e.id);
    if (eventIds.length === 0) return [];

    const { data: guestLists, error } = await supabase
      .from('guest_lists')
      .select('*')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!guestLists || guestLists.length === 0) return [];

    const guestListIds = guestLists.map((gl) => gl.id);
    const { data: allGuests } = await supabase
      .from('guests')
      .select('*')
      .in('guest_list_id', guestListIds);

    const { data: events } = await supabase
      .from('event')
      .select('*')
      .in('id', eventIds);

    return guestLists.map((gl) => ({
      ...gl,
      guests: allGuests?.filter((g) => g.guest_list_id === gl.id) || [],
      event: events?.find((e) => e.id === gl.event_id) || null,
    }));
  }

  async findAll(): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch all guest lists
    const { data: guestLists, error } = await supabase
      .from('guest_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!guestLists || guestLists.length === 0) return [];

    // Fetch guests for all guest lists
    const guestListIds = guestLists.map((gl) => gl.id);
    const { data: allGuests } = await supabase
      .from('guests')
      .select('*')
      .in('guest_list_id', guestListIds);

    // Fetch events for all guest lists
    const eventIds = [
      ...new Set(guestLists.map((gl) => gl.event_id).filter(Boolean)),
    ];
    const { data: events } = await supabase
      .from('event')
      .select('*')
      .in('id', eventIds);

    // Map guests and events to guest lists
    return guestLists.map((gl) => ({
      ...gl,
      guests: allGuests?.filter((g) => g.guest_list_id === gl.id) || [],
      event: events?.find((e) => e.id === gl.event_id) || null,
    }));
  }

  async findByClient(clientId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(
        `
        *,
        *
      `,
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByEvent(eventId: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(
        `
        *,
        *
      `,
      )
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findOne(id: number): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch guest list
    const { data: guestListData, error: guestListError } = await supabase
      .from('guest_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (guestListError && guestListError.code !== 'PGRST116')
      throw guestListError;
    if (!guestListData) return null;

    // Fetch event details
    const { data: eventData } = await supabase
      .from('event')
      .select('*')
      .eq('id', guestListData.event_id)
      .single();

    // Fetch guests
    const { data: guestsData } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', id)
      .order('created_at', { ascending: true });

    return {
      ...guestListData,
      event: eventData,
      guests: guestsData || [],
    };
  }

  async findByShareToken(token: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(
        `
        *,
        *
      `,
      )
      .eq('share_token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findByAccessCode(code: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch guest list
    const { data: guestListData, error } = await supabase
      .from('guest_lists')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!guestListData) return null;

    // Fetch event details
    const { data: eventData } = await supabase
      .from('event')
      .select('*')
      .eq('id', guestListData.event_id)
      .single();

    // Fetch guests
    const { data: guestsData } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', guestListData.id)
      .order('created_at', { ascending: true });

    return {
      ...guestListData,
      event: eventData,
      guests: guestsData || [],
    };
  }

  async validateAccessCode(
    guestListId: number,
    accessCode: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select('access_code')
      .eq('id', guestListId)
      .eq('access_code', accessCode.toUpperCase())
      .single();

    return !error && data !== null;
  }

  async findByArrivalToken(token: string): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(
        `
        *,
        *
      `,
      )
      .eq('arrival_token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async create(guestListData: any): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    // Enforce one guest list per event
    const { data: existing } = await supabase
      .from('guest_lists')
      .select('id')
      .eq('event_id', guestListData.eventId)
      .maybeSingle();
    if (existing) {
      throw Object.assign(
        new Error('A guest list already exists for this event.'),
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from('guest_lists')
      .insert({
        client_id: null,
        intake_form_id:
          guestListData.clientId || guestListData.intakeFormId || null,
        event_id: guestListData.eventId,
        max_guests_per_person: guestListData.maxGuestsPerPerson || 0,
        access_code: this.generateAccessCode(),
        share_token: this.generateToken(),
        arrival_token: this.generateToken(),
        is_locked: false,
      })
      .select(
        `
        *,
        *
      `,
      )
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: number, guestListData: any): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    const updateData: any = {};
    if (guestListData.maxGuestsPerPerson !== undefined)
      updateData.max_guests_per_person = guestListData.maxGuestsPerPerson;
    if (guestListData.isLocked !== undefined)
      updateData.is_locked = guestListData.isLocked;

    const { data, error } = await supabase
      .from('guest_lists')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        *
      `,
      )
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async lock(id: number): Promise<any> {
    return this.update(id, { isLocked: true });
  }

  async unlock(id: number): Promise<any> {
    return this.update(id, { isLocked: false });
  }

  async delete(id: number): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    // Delete guests first
    await supabase.from('guests').delete().eq('guest_list_id', id);

    // Delete guest list
    const { error } = await supabase.from('guest_lists').delete().eq('id', id);
    if (error) throw error;
  }

  // Guest management
  async getGuests(guestListId: number): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', guestListId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addGuest(guestListId: number, guestData: any): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guests')
      .insert({
        guest_list_id: guestListId,
        name: guestData.name,
        phone: guestData.phone || null,
        plus_one_count: guestData.plusOnes || 0,
        has_arrived: false,
        is_vip: guestData.isVip ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error(
        '[GuestListsService] addGuest error:',
        error.message,
        error.details,
        error.hint,
      );
      throw error;
    }
    return data;
  }

  async updateGuest(guestId: number, guestData: any): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();

    const updateData: any = {};
    if (guestData.name !== undefined) updateData.name = guestData.name;
    if (guestData.phone !== undefined) updateData.phone = guestData.phone;
    if (guestData.plusOnes !== undefined)
      updateData.plus_one_count = guestData.plusOnes;
    if (guestData.hasArrived !== undefined)
      updateData.has_arrived = guestData.hasArrived;
    if (guestData.arrivedAt !== undefined)
      updateData.arrived_at = guestData.arrivedAt;
    if (guestData.isVip !== undefined) updateData.is_vip = guestData.isVip;

    const { data, error } = await supabase
      .from('guests')
      .update(updateData)
      .eq('id', guestId)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async deleteGuest(guestId: number): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase.from('guests').delete().eq('id', guestId);
    if (error) throw error;
  }

  async markArrival(guestId: number): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guests')
      .update({
        has_arrived: true,
        arrived_at: new Date().toISOString(),
      })
      .eq('id', guestId)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async unmarkArrival(guestId: number): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guests')
      .update({
        has_arrived: false,
        arrived_at: null,
      })
      .eq('id', guestId)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async smsClientInvite(
    id: number,
  ): Promise<{ sent: boolean; to?: string; error?: string }> {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch the guest list
    const { data: guestList, error } = await supabase
      .from('guest_lists')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !guestList) throw new Error('Guest list not found');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${frontendUrl}/guest-list/share/${guestList.share_token}`;
    const message =
      `You've been invited to view and edit the guest list!\n\n` +
      `Link: ${shareUrl}\nAccess Code: ${guestList.access_code}\n\n` +
      `Open the link and enter the code to get started.`;

    // Look up phone via: guest_list.event_id → event.client_id → intake_forms.contact_phone
    let phone: string | null = null;

    if (guestList.event_id) {
      // Get the event to find the client_id
      const { data: event } = await supabase
        .from('event')
        .select('client_id')
        .eq('id', guestList.event_id)
        .maybeSingle();

      if (event?.client_id) {
        // client_id on event references intake_forms.id
        const { data: form } = await supabase
          .from('intake_forms')
          .select('contact_phone, contact_name')
          .eq('id', event.client_id)
          .maybeSingle();
        if (form?.contact_phone) phone = form.contact_phone;
      }
    }

    // Fallback: try guest_list.intake_form_id or client_id directly against intake_forms or users
    if (!phone && (guestList.intake_form_id || guestList.client_id)) {
      const lookupId = guestList.intake_form_id || guestList.client_id;
      const { data: form } = await supabase
        .from('intake_forms')
        .select('contact_phone')
        .eq('id', lookupId)
        .maybeSingle();
      if (form?.contact_phone) phone = form.contact_phone;

      if (!phone && guestList.client_id) {
        const { data: userRow } = await supabase
          .from('users')
          .select('phone_number')
          .eq('id', guestList.client_id)
          .maybeSingle();
        if (userRow?.phone_number) phone = userRow.phone_number;
      }
    }

    if (!phone) {
      return { sent: false, error: 'No phone number found for this client.' };
    }

    try {
      await this.smsNotifications.send(phone, message);
      return { sent: true, to: phone };
    } catch (smsErr: any) {
      return { sent: false, error: smsErr?.message || 'SMS failed' };
    }
  }

  /**
   * Live-sync a single RSVP response into the venue owner's Door List.
   * Called automatically whenever a guest responds to an RSVP invite, so the
   * owner's Door List reflects the client-portal RSVP status without the
   * manual "Import from RSVP" button.
   *
   * - status 'attending' → upserts a `guests` row linked via `rsvp_guest_id`
   *   (creates the event's guest_list on first sync if one doesn't exist yet)
   * - status 'declined'  → removes the linked `guests` row, if any
   */
  async syncRsvpGuest(
    eventId: string | number,
    rsvpGuest: {
      id: string;
      guest_name: string;
      guest_phone?: string | null;
      plus_ones?: number | null;
      status: string;
    },
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    if (rsvpGuest.status !== 'attending') {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('rsvp_guest_id', rsvpGuest.id);
      if (error) throw error;
      return;
    }

    const { data: foundList, error: listError } = await supabase
      .from('guest_lists')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();
    if (listError) throw listError;
    let guestList = foundList;

    if (!guestList) {
      const { data: created, error: createErr } = await supabase
        .from('guest_lists')
        .insert({
          event_id: eventId,
          access_code: this.generateAccessCode(),
          share_token: this.generateToken(),
          arrival_token: this.generateToken(),
        })
        .select('id')
        .single();
      if (createErr) throw createErr;
      guestList = created;
    }

    const { data: linkedGuest, error: lookupError } = await supabase
      .from('guests')
      .select('id')
      .eq('rsvp_guest_id', rsvpGuest.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    let existing = linkedGuest;

    if (!existing) {
      const { data: legacyGuests, error: legacyError } = await supabase
        .from('guests')
        .select('id, name, phone, rsvp_guest_id')
        .eq('guest_list_id', guestList.id);
      if (legacyError) throw legacyError;
      const matches = (legacyGuests || []).filter(
        (candidate) =>
          !candidate.rsvp_guest_id &&
          candidate.name.trim().toLowerCase() ===
            rsvpGuest.guest_name.trim().toLowerCase() &&
          (candidate.phone || '') === (rsvpGuest.guest_phone || ''),
      );
      if (matches.length === 1) existing = matches[0];
    }

    if (existing) {
      const { error } = await supabase
        .from('guests')
        .update({
          rsvp_guest_id: rsvpGuest.id,
          name: rsvpGuest.guest_name,
          phone: rsvpGuest.guest_phone || null,
          plus_one_count: rsvpGuest.plus_ones ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error: insertErr } = await supabase.from('guests').insert({
        guest_list_id: guestList.id,
        rsvp_guest_id: rsvpGuest.id,
        name: rsvpGuest.guest_name,
        phone: rsvpGuest.guest_phone || null,
        plus_one_count: rsvpGuest.plus_ones ?? 0,
        has_arrived: false,
      });
      if (insertErr) throw insertErr;
    }
  }

  /**
   * Import attending RSVP guests into a guest list.
   * Looks up rsvp_guests via: guest_list → event_id → intake_forms → rsvp_guests(status=attending)
   * Skips guests already on the list (matched by name, case-insensitive).
   */
  async importFromRsvp(
    guestListId: number,
  ): Promise<{ imported: number; skipped: number }> {
    const supabase = this.supabaseService.getAdminClient();

    // Get the guest list to find event_id
    const { data: guestList, error: glErr } = await supabase
      .from('guest_lists')
      .select('id, event_id')
      .eq('id', guestListId)
      .single();
    if (glErr || !guestList) throw new Error('Guest list not found');

    const { data: event, error: eventError } = await supabase
      .from('event')
      .select('intake_form_id, client_id')
      .eq('id', guestList.event_id)
      .single();
    if (eventError) throw eventError;
    const { data: forms, error: formsError } = await supabase
      .from('intake_forms')
      .select('id')
      .eq('event_id', guestList.event_id);
    if (formsError) throw formsError;
    const intakeFormIds = [
      ...new Set(
        [
          ...(forms || []).map((form: any) => form.id),
          event?.intake_form_id,
          event?.client_id,
        ].filter(Boolean),
      ),
    ];
    if (!intakeFormIds.length) return { imported: 0, skipped: 0 };

    // Get attending RSVP guests
    const { data: rsvpGuests, error: rsvpErr } = await supabase
      .from('rsvp_guests')
      .select('id, guest_name, guest_phone, plus_ones, status')
      .in('intake_form_id', intakeFormIds);
    if (rsvpErr) throw rsvpErr;
    if (!rsvpGuests?.length) return { imported: 0, skipped: 0 };

    // Get existing guests to avoid duplicates
    const { data: existing, error: existingError } = await supabase
      .from('guests')
      .select('rsvp_guest_id')
      .eq('guest_list_id', guestListId);
    if (existingError) throw existingError;
    const linkedIds = new Set((existing || []).map((row) => row.rsvp_guest_id));
    let imported = 0;
    let skipped = 0;
    for (const guest of rsvpGuests) {
      await this.syncRsvpGuest(guestList.event_id, guest);
      if (guest.status === 'attending') {
        if (linkedIds.has(guest.id)) skipped++;
        else imported++;
      }
    }
    return { imported, skipped };
  }
}
