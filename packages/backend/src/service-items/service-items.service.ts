import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ServiceItemCategory } from '../entities/service-item.entity';

export interface ServiceItem {
  id?: string;
  name: string;
  description: string;
  category: ServiceItemCategory;
  default_price: number;
  is_active: boolean;
  sort_order: number;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class ServiceItemsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(supabase: any, userId: string): Promise<ServiceItem[]> {
    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findByCategory(supabase: any, userId: string, category: ServiceItemCategory): Promise<ServiceItem[]> {
    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('category', category)
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findOne(supabase: any, userId: string, id: string): Promise<ServiceItem | null> {
    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('id', id)
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async create(supabase: any, userId: string, item: Partial<ServiceItem>): Promise<ServiceItem> {
    const itemWithOwner = { ...item, owner_id: userId };
    const { data, error } = await supabase
      .from('service_items')
      .insert(itemWithOwner)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: any, userId: string, id: string, item: Partial<ServiceItem>): Promise<ServiceItem | null> {
    const { data, error } = await supabase
      .from('service_items')
      .update(item)
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async delete(supabase: any, userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('service_items')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId);

    if (error) throw error;
  }
}
