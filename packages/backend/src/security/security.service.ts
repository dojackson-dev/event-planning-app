import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SecurityService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(supabase: SupabaseClient, ownerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('security')
      .select('*, event:events(*)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async findOne(supabase: SupabaseClient, ownerId: string, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('security')
      .select('*, event:events(*)')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .single();
    if (error) throw error;
    return data;
  }

  async findByEvent(supabase: SupabaseClient, ownerId: string, eventId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('security')
      .select('*, event:events(*)')
      .eq('event_id', eventId)
      .eq('owner_id', ownerId)
      .order('arrival_time', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async create(supabase: SupabaseClient, ownerId: string, securityData: any): Promise<any> {
    const { data, error } = await supabase
      .from('security')
      .insert([{ ...securityData, owner_id: ownerId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, ownerId: string, id: string, securityData: any): Promise<any | null> {
    const { data, error } = await supabase
      .from('security')
      .update(securityData)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async recordArrival(supabase: SupabaseClient, ownerId: string, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('security')
      .update({ arrival_time: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();
    if (error) throw error;
    return data;

    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.securityRepository.delete(id);
  }
}
