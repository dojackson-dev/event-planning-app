import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(supabase: SupabaseClient, ownerId: string, createDto: any) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...createDto, owner_id: ownerId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(supabase: SupabaseClient, ownerId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('owner_id', ownerId)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async findOne(supabase: SupabaseClient, ownerId: string, id: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, ownerId: string, id: string, updateDto: any) {
    const { data, error } = await supabase
      .from('appointments')
      .update(updateDto)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(supabase: SupabaseClient, ownerId: string, id: string) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw error;
    return { message: 'Appointment deleted successfully' };
  }
}
