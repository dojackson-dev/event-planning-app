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
      clientId: 'client_id',
      ownerId: 'owner_id',
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
      client_id: 'clientId',
      owner_id: 'ownerId',
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

  private formatEventType(type: string): string {
    const labels: Record<string, string> = {
      wedding: 'Wedding',
      birthday: 'Birthday',
      birthday_party: 'Birthday Party',
      party: 'Party',
      graduation_party: 'Graduation Party',
      baby_shower: 'Baby Shower',
      retirement: 'Retirement',
      holiday_party: 'Holiday Party',
      engagement_party: 'Engagement Party',
      prom_formal: 'Prom / Formal',
      family_reunion: 'Family Reunion',
      quinceanera: 'Quincea\u00f1era',
      sweet_16: 'Sweet 16',
      corporate: 'Corporate Event',
      conference: 'Conference',
      workshop: 'Workshop',
      anniversary: 'Anniversary',
      concert_show: 'Concert / Show',
      memorial_service: 'Memorial Service',
      other: 'Other',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  }

  async findAll(supabase: SupabaseClient, userId: string): Promise<Event[]> {
    // Use admin client so the intake_forms join isn't blocked by RLS
    const adminClient = this.supabaseService.getAdminClient();
    const { data, error } = await adminClient
      .from('event')
      .select('*, intake_form:intake_forms!intake_form_id(contact_name, event_name, event_type)')
      .eq('owner_id', userId)
      .order('date', { ascending: true });

    if (error) {
      // Fall back to basic query if join fails (migration not yet run)
      const { data: basicData, error: basicError } = await supabase
        .from('event')
        .select('*')
        .eq('owner_id', userId)
        .order('date', { ascending: true });
      if (basicError) throw basicError;
      return (basicData || []).map(event => this.snakeToCamelCase(event));
    }

    return (data || []).map(event => {
      const converted = this.snakeToCamelCase(event);
      // Flatten intake form fields onto the event
      if (event.intake_form) {
        converted.clientName = event.intake_form.contact_name || null;
        converted.intakeEventName = event.intake_form.event_name || null;
        // If no explicit event_name, derive a readable title from event_type
        if (!converted.intakeEventName && event.intake_form.event_type) {
          converted.intakeEventName = this.formatEventType(event.intake_form.event_type);
        }
      }
      delete converted.intakeForm;
      return converted;
    });
  }

  async findOne(supabase: SupabaseClient, id: string, userId: string): Promise<Event | null> {
    // Try with intake_form join for client name + event name display
    const adminClient = this.supabaseService.getAdminClient();
    const { data, error } = await adminClient
      .from('event')
      .select('*, intake_form:intake_forms!intake_form_id(contact_name, event_name, event_type)')
      .eq('id', id)
      .eq('owner_id', userId)
      .single();

    if (error) {
      // Fall back to basic query without join
      const { data: basicData, error: basicError } = await supabase
        .from('event')
        .select('*')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();
      if (basicError) throw basicError;
      return basicData ? this.snakeToCamelCase(basicData) : null;
    }
    if (!data) return null;

    const converted = this.snakeToCamelCase(data);
    if (data.intake_form) {
      converted.clientName = data.intake_form.contact_name || null;
      converted.intakeEventName = data.intake_form.event_name || null;
      if (!converted.intakeEventName && data.intake_form.event_type) {
        converted.intakeEventName = this.formatEventType(data.intake_form.event_type);
      }
    }
    delete converted.intakeForm;
    return converted;
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

  async update(supabase: SupabaseClient, id: string, event: Partial<Event>, userId: string): Promise<Event | null> {
    const convertedEvent = this.camelToSnakeCase(event);
    const { data, error } = await supabase
      .from('event')
      .update(convertedEvent)
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data ? this.snakeToCamelCase(data) : null;
  }

  async remove(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId);

    if (error) throw error;
  }
}
