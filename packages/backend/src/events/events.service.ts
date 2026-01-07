import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { Event } from '../entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  private camelToSnakeCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Field mapping for special cases where frontend field doesn't match database column
    const fieldMapping: Record<string, string> = {
      maxGuests: 'guest_count',
      startTime: 'start_time',
      endTime: 'end_time',
      specialRequirements: 'special_requirements',
    };
    
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Use field mapping if available, otherwise convert camelCase to snake_case
        const snakeKey = fieldMapping[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
      }
    }
    return result;
  }

  private snakeToCamelCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Reverse field mapping
    const reverseFieldMapping: Record<string, string> = {
      guest_count: 'maxGuests',
      start_time: 'startTime',
      end_time: 'endTime',
      special_requirements: 'specialRequirements',
    };
    
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Use reverse field mapping if available, otherwise convert snake_case to camelCase
        const camelKey = reverseFieldMapping[key] || key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        // Preserve date as string, don't convert to Date object
        result[camelKey] = obj[key];
      }
    }
    return result;
  }

  async findAll(supabase: SupabaseClient): Promise<Event[]> {
    const { data, error } = await supabase
      .from('event')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []).map(event => this.snakeToCamelCase(event));
  }

  async findOne(supabase: SupabaseClient, id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('event')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.snakeToCamelCase(data) : null;
  }

  async create(supabase: SupabaseClient, event: Partial<Event>): Promise<Event> {
    const convertedEvent = this.camelToSnakeCase(event);
    console.log('Creating event with converted data:', JSON.stringify(convertedEvent, null, 2));
    
    const { data, error } = await supabase
      .from('event')
      .insert([convertedEvent])
      .select()
      .single();

    if (error) {
      console.error('Supabase create error:', error);
      throw error;
    }
    return this.snakeToCamelCase(data);
  }

  async update(supabase: SupabaseClient, id: string, event: Partial<Event>): Promise<Event | null> {
    const convertedEvent = this.camelToSnakeCase(event);
    const { data, error } = await supabase
      .from('event')
      .update(convertedEvent)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? this.snakeToCamelCase(data) : null;
  }

  async remove(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('event')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
