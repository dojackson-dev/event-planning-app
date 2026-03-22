import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

@Injectable()
export class SecurityService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

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
      .select('*, event:events(*)')
      .single();
    if (error) throw error;

    // Notify the security personnel of their assignment
    try {
      const phone: string | null = data.phone ?? null;
      const name: string = data.name ?? data.officer_name ?? 'Security Personnel';
      const eventName: string = (data.event as any)?.name ?? 'the upcoming event';
      const eventDate: string = (data.event as any)?.date
        ? new Date((data.event as any).date).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
          })
        : '';
      const location: string | undefined =
        (data.event as any)?.venue_name ?? (data.event as any)?.location ?? undefined;
      await this.smsNotifications.securityAssigned(phone, name, eventName, eventDate, location);
    } catch {
      // SMS errors must never break security creation
    }

    return data;
  }

  async update(supabase: SupabaseClient, ownerId: string, id: string, securityData: any): Promise<any | null> {
    const { data, error } = await supabase
      .from('security')
      .update(securityData)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('*, event:events(*)')
      .single();
    if (error) throw error;

    // Notify the security personnel of the update
    try {
      const phone: string | null = data.phone ?? null;
      const name: string = data.name ?? data.officer_name ?? 'Security Personnel';
      const eventName: string = (data.event as any)?.name ?? 'the upcoming event';
      await this.smsNotifications.securityUpdated(phone, name, eventName);
    } catch {
      // SMS errors must never break the update
    }

    return data;
  }

  async recordArrival(supabase: SupabaseClient, ownerId: string, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('security')
      .update({ arrival_time: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('*, event:events(*)')
      .single();
    if (error) throw error;

    // Send arrival confirmation SMS
    try {
      const phone: string | null = data.phone ?? null;
      const name: string = data.name ?? data.officer_name ?? 'Security Personnel';
      const eventName: string = (data.event as any)?.name ?? 'the event';
      await this.smsNotifications.securityArrivalRecorded(phone, name, eventName);
    } catch {
      // SMS errors must never break arrival recording
    }

    return data;
  }

  async remove(supabase: SupabaseClient, ownerId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('security')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);
    if (error) throw error;
  }
}
