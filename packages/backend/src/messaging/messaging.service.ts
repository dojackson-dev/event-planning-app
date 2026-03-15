import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { TwilioService } from './twilio.service.js';

export type MessageType = 'reminder' | 'invoice' | 'confirmation' | 'update' | 'support' | 'announcement' | 'custom';
export type RecipientType = 'client' | 'guest' | 'security' | 'custom';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private supabaseService: SupabaseService,
    private twilioService: TwilioService,
  ) {}

  /** Normalize DB row: map `message` column -> `content` for frontend compatibility */
  private mapRow(row: any) {
    if (!row) return row;
    const { message, ...rest } = row;
    return { ...rest, content: rest.content ?? message };
  }

  async findAll(supabase: any, ownerId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, event:events(id, name, date)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => this.mapRow(r));
  }

  async findByEvent(supabase: any, ownerId: string, eventId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, event:events(id, name, date)')
      .eq('owner_id', ownerId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => this.mapRow(r));
  }

  async findOne(supabase: any, ownerId: string, id: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, event:events(id, name, date)')
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  async sendMessage(supabase: any, ownerId: string, messageData: {
    recipientPhone: string;
    recipientName: string;
    recipientType: RecipientType;
    userId?: string;
    eventId?: string;
    messageType: MessageType;
    content: string;
    skipOptInCheck?: boolean;
  }) {
    // Enforce opt-in for named users (client/guest recipient types)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!messageData.skipOptInCheck && messageData.userId && UUID_REGEX.test(messageData.userId)) {
      const { data: recipient } = await supabase
        .from('users')
        .select('sms_opt_in')
        .eq('id', messageData.userId)
        .single();

      if (recipient && recipient.sms_opt_in === false) {
        throw new BadRequestException(
          `Recipient has not opted in to SMS messages. Messages can only be sent to users who have given express consent.`,
        );
      }
    }

    const { data: savedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        owner_id: ownerId,
        recipient_phone: messageData.recipientPhone,
        recipient_name: messageData.recipientName,
        recipient_type: messageData.recipientType,
        user_id: messageData.userId && UUID_REGEX.test(messageData.userId) ? messageData.userId : null,
        event_id: messageData.eventId && UUID_REGEX.test(messageData.eventId) ? messageData.eventId : null,
        message_type: messageData.messageType,
        // Support both column names: existing tables use "message", new tables use "content"
        message: messageData.content,
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
      return this.mapRow(updated);
    } catch (err: any) {
      const { data: updated } = await supabase
        .from('messages')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', savedMessage.id)
        .select()
        .single();
      return this.mapRow(updated);
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

    if (!message || !message.twilio_sid) return this.mapRow(message);

    try {
      const status = await this.twilioService.getMessageStatus(message.twilio_sid);
      const { data: updated } = await supabase
        .from('messages')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      return this.mapRow(updated);
    } catch (err) {
      console.error('Failed to update message status:', err);
      return this.mapRow(message);
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

  /**
   * Processes an inbound Twilio webhook message.
   * Handles STOP (opt-out) and START (opt-in) keywords by updating the
   * sms_opt_in flag on the matching user record — using the admin Supabase
   * client so the webhook can run without a user JWT.
   */
  async handleInboundMessage(adminSupabase: any, body: string, from: string): Promise<void> {
    const { action } = this.twilioService.parseInboundMessage(body, from);
    if (!action) return;

    const optIn = action === 'start';
    const updatePayload: Record<string, any> = { sms_opt_in: optIn };
    if (optIn) {
      updatePayload.sms_opt_in_at = new Date().toISOString();
      updatePayload.sms_opt_out_at = null;
    } else {
      updatePayload.sms_opt_out_at = new Date().toISOString();
    }

    const { error } = await adminSupabase
      .from('users')
      .update(updatePayload)
      .eq('phone', from);

    if (error) {
      this.logger.error(`Failed to update opt-in for ${from}: ${error.message}`);
    } else {
      this.logger.log(`SMS opt-${optIn ? 'in' : 'out'} processed for ${from}`);
    }
  }
}
