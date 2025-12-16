import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async findAll(supabase: SupabaseClient): Promise<Booking[]> {
    console.log('Fetching bookings...');
    const { data, error } = await supabase
      .from('booking')
      .select(`
        *,
        event:event(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
    console.log('Bookings fetched:', data?.length || 0);
    return data || [];
  }

  async findOne(supabase: SupabaseClient, id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('booking')
      .select(`
        *,
        event:event(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(supabase: SupabaseClient, booking: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from('booking')
      .insert([booking])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, id: string, booking: Partial<Booking>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('booking')
      .update(booking)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('booking')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
