import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { Event } from '../entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async findAll(supabase: SupabaseClient): Promise<Event[]> {
    const { data, error } = await supabase
      .from('event')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findOne(supabase: SupabaseClient, id: number): Promise<Event | null> {
    const { data, error } = await supabase
      .from('event')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(supabase: SupabaseClient, event: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('event')
      .insert([event])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, id: number, event: Partial<Event>): Promise<Event | null> {
    const { data, error } = await supabase
      .from('event')
      .update(event)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(supabase: SupabaseClient, id: number): Promise<void> {
    const { error } = await supabase
      .from('event')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
