import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as crypto from 'crypto';

@Injectable()
export class GuestListsService {
  constructor(private supabaseService: SupabaseService) {}

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
    const guestListIds = guestLists.map(gl => gl.id);
    const { data: allGuests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .in('guest_list_id', guestListIds);

    // Fetch events for all guest lists
    const eventIds = [...new Set(guestLists.map(gl => gl.event_id).filter(Boolean))];
    const { data: events, error: eventsError } = await supabase
      .from('event')
      .select('*')
      .in('id', eventIds);

    // Map guests and events to guest lists
    return guestLists.map(gl => ({
      ...gl,
      guests: allGuests?.filter(g => g.guest_list_id === gl.id) || [],
      event: events?.find(e => e.id === gl.event_id) || null
    }));
  }

  async findByClient(clientId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(`
        *,
        *
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByEvent(eventId: number): Promise<any | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(`
        *,
        *
      `)
      .eq('event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findOne(id: number): Promise<any | null> {
    const supabase = this.supabaseService.getAdminClient();
    
    // Fetch guest list
    const { data: guestListData, error: guestListError } = await supabase
      .from('guest_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (guestListError && guestListError.code !== 'PGRST116') throw guestListError;
    if (!guestListData) return null;

    // Fetch event details
    const { data: eventData, error: eventError } = await supabase
      .from('event')
      .select('*')
      .eq('id', guestListData.event_id)
      .single();

    // Fetch guests
    const { data: guestsData, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', id)
      .order('created_at', { ascending: true });

    return {
      ...guestListData,
      event: eventData,
      guests: guestsData || []
    };
  }

  async findByShareToken(token: string): Promise<any | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(`
        *,
        *
      `)
      .eq('share_token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findByAccessCode(code: string): Promise<any | null> {
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
      guests: guestsData || []
    };
  }

  async validateAccessCode(guestListId: number, accessCode: string): Promise<boolean> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select('access_code')
      .eq('id', guestListId)
      .eq('access_code', accessCode.toUpperCase())
      .single();

    return !error && data !== null;
  }

  async findByArrivalToken(token: string): Promise<any | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .select(`
        *,
        *
      `)
      .eq('arrival_token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async create(guestListData: any): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('guest_lists')
      .insert({
        client_id: guestListData.clientId,
        event_id: guestListData.eventId,
        max_guests_per_person: guestListData.maxGuestsPerPerson || 0,
        access_code: this.generateAccessCode(),
        share_token: this.generateToken(),
        arrival_token: this.generateToken(),
        is_locked: false,
      })
      .select(`
        *,
        *
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: number, guestListData: any): Promise<any | null> {
    const supabase = this.supabaseService.getAdminClient();
    
    const updateData: any = {};
    if (guestListData.maxGuestsPerPerson !== undefined) updateData.max_guests_per_person = guestListData.maxGuestsPerPerson;
    if (guestListData.isLocked !== undefined) updateData.is_locked = guestListData.isLocked;

    const { data, error } = await supabase
      .from('guest_lists')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        *
      `)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async lock(id: number): Promise<any | null> {
    return this.update(id, { isLocked: true });
  }

  async unlock(id: number): Promise<any | null> {
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
        phone: guestData.phone,
        plus_one_count: guestData.plusOnes || 0,
        has_arrived: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateGuest(guestId: number, guestData: any): Promise<any | null> {
    const supabase = this.supabaseService.getAdminClient();
    
    const updateData: any = {};
    if (guestData.name !== undefined) updateData.name = guestData.name;
    if (guestData.phone !== undefined) updateData.phone = guestData.phone;
    if (guestData.plusOnes !== undefined) updateData.plus_one_count = guestData.plusOnes;
    if (guestData.hasArrived !== undefined) updateData.has_arrived = guestData.hasArrived;
    if (guestData.arrivedAt !== undefined) updateData.arrived_at = guestData.arrivedAt;

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

  async markArrival(guestId: number): Promise<any | null> {
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

  async unmarkArrival(guestId: number): Promise<any | null> {
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
}
