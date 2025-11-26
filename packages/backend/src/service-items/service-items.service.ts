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

  async findAll(): Promise<ServiceItem[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findByCategory(category: ServiceItemCategory): Promise<ServiceItem[]> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findOne(id: string): Promise<ServiceItem | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async create(item: Partial<ServiceItem>): Promise<ServiceItem> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('service_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, item: Partial<ServiceItem>): Promise<ServiceItem | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('service_items')
      .update(item)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async delete(id: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from('service_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
