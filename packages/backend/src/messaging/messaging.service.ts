import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { TwilioService } from './twilio.service.js';

@Injectable()
export class MessagingService {
  constructor(
    private supabaseService: SupabaseService,
    private twilioService: TwilioService,
  ) {}

  async findAll(supabase: any, ownerId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, event:events(id, name, date)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findByEvent(supabase: any, ownerId: string, eventId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, event:events(id, name, date)')
      .eq('owner_id', ownerId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async findOne(supabase: any, ownerId: string, id: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, event:events(id, name, date)')
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async sendMessage(supabase: any, ownerId: string, messageData: {
    recipientPhone: string;
    recipientName: string;
    recipientType: 'client' | 'guest' | 'security' | 'custom';
    userId?: string;
    eventId?: string;
    messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
    content: string;
  }) {
    const { data: savedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        owner_id: ownerId,
        recipient_phone: messageData.recipientPhone,
        recipient_name: messageData.recipientName,
        recipient_type: messageData.recipientType,
        user_id: messageData.userId || null,
        event_id: messageData.eventId || null,
        message_type: messageData.messageType,
        content: messageData.content,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    try {
      const result = await this.twilioService.sendSMS(
        messageData.recipientPhone,
        messageData.content,
      );
      const { data: updated } = await supabase
        .from('messages')
        .update({ status: 'sent', twilio_sid: result.sid, sent_at: new Date().toISOString() })
        .eq('id', savedMessage.id)
        .select()
        .single();
      return updated;
    } catch (err: any) {
      const { data: updated } = await supabase
        .from('messages')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', savedMessage.id)
        .select()
        .single();
      return updated;
    }
  }

  async sendBulkMessages(supabase: any, ownerId: string, messages: any[]) {
    const results: any[] = [];
    for (const messageData of messages) {
      try {
        const message = await this.sendMessage(supabase, ownerId, messageData);
        results.push(message);
      } catch (err: any) {
        console.error(`Failed to send to ${messageData.recipientPhone}:`, err);
      }
    }
    return results;
  }

  async updateMessageStatus(supabase: any, ownerId: string, id: string) {
    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();

    if (!message || !message.twilio_sid) return message;

    try {
      const status = await this.twilioService.getMessageStatus(message.twilio_sid);
      const { data: updated } = await supabase
        .from('messages')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      return updated;
    } catch (err) {
      console.error('Failed to update message status:', err);
      return message;
    }
  }

  async deleteMessage(supabase: any, ownerId: string, id: string) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('owner_id', ownerId)
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async getMessageStats(supabase: any, ownerId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('status')
      .eq('owner_id', ownerId);
    if (error) throw new Error(error.message);
    const msgs = data || [];
    return {
      total: msgs.length,
      sent: msgs.filter((m: any) => m.status === 'sent').length,
      delivered: msgs.filter((m: any) => m.status === 'delivered').length,
      failed: msgs.filter((m: any) => m.status === 'failed').length,
      pending: msgs.filter((m: any) => m.status === 'pending').length,
    };
  }
}
