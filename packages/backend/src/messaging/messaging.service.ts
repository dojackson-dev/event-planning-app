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

    // When skipOptInCheck is true the caller is sending to an intake-form client.
    // The "userId" in that case is the intake_form row UUID, NOT an auth.users UUID,
    // so we must NOT store it as user_id (would violate the FK constraint).
    const resolvedUserId =
      !messageData.skipOptInCheck &&
      messageData.userId &&
      UUID_REGEX.test(messageData.userId)
        ? messageData.userId
        : null;

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
        user_id: resolvedUserId,
        // event_id FK references "events" but app uses table "event" (singular) — store null to avoid FK violation
        event_id: null,
        message_type: messageData.messageType,
        // Write both columns: older schema uses "message", newer uses "content"
        message: messageData.content,
        content: messageData.content,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      this.logger.error('messages insert failed', insertError.message, insertError);
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    try {
      const typeLabel: Record<string, string> = {
        reminder: 'Reminder',
        invoice: 'Invoice',
        confirmation: 'Confirmation',
        update: 'Update',
        support: 'Support',
        announcement: 'Announcement',
        custom: 'Custom',
      };
      const label = typeLabel[messageData.messageType] ?? 'Notification';
      const result = await this.twilioService.sendSMS(
        messageData.recipientPhone,
        `DoVenue Suite ${label} Message\n${messageData.content}`,
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

  // ── Client Chat Inbox (owner side) ────────────────────────────────────────

  /**
   * Returns all client threads for the owner, grouped by event.
   * Each thread entry includes: event details, client name/email,
   * last message preview, and unread count.
   */
  async getClientInbox(ownerId: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch all distinct event+client pairs for this owner
    const { data: msgs, error } = await supabase
      .from('client_messages')
      .select('event_id, client_id, content, sender_type, is_read, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('getClientInbox error', error.message);
      return [];
    }
    if (!msgs || msgs.length === 0) return [];

    // Build per-thread map (keyed by event_id+client_id)
    const threadMap: Record<string, {
      eventId: string;
      clientId: string;
      lastMessage: string;
      lastMessageAt: string;
      lastMessageSender: string;
      unreadCount: number;
    }> = {};

    for (const m of msgs) {
      const key = `${m.event_id}::${m.client_id}`;
      if (!threadMap[key]) {
        threadMap[key] = {
          eventId: m.event_id,
          clientId: m.client_id,
          lastMessage: m.content,
          lastMessageAt: m.created_at,
          lastMessageSender: m.sender_type,
          unreadCount: 0,
        };
      }
      if (m.sender_type === 'client' && !m.is_read) {
        threadMap[key].unreadCount += 1;
      }
    }

    const threads = Object.values(threadMap);
    const eventIds = [...new Set(threads.map(t => t.eventId))];

    // Fetch event details
    const { data: events } = await supabase
      .from('event')
      .select('id, name, date')
      .in('id', eventIds);

    const eventInfoMap: Record<string, { name: string; date: string }> = {};
    for (const ev of events || []) {
      eventInfoMap[ev.id] = { name: ev.name || 'Event', date: ev.date };
    }

    // Fetch client info from intake_forms linked to these events
    const { data: intakeForms } = await supabase
      .from('intake_forms')
      .select('id, contact_name, contact_email, contact_phone')
      .in('id', threads.map(t => t.clientId));

    const clientInfoMap: Record<string, { name: string; email: string }> = {};
    for (const f of intakeForms || []) {
      clientInfoMap[f.id] = { name: f.contact_name || 'Client', email: f.contact_email || '' };
    }

    return threads
      .map(t => ({
        eventId: t.eventId,
        eventName: eventInfoMap[t.eventId]?.name || 'Event',
        eventDate: eventInfoMap[t.eventId]?.date || null,
        clientId: t.clientId,
        clientName: clientInfoMap[t.clientId]?.name || 'Client',
        clientEmail: clientInfoMap[t.clientId]?.email || '',
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        lastMessageSender: t.lastMessageSender,
        unreadCount: t.unreadCount,
      }))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /** Returns the full message thread for one event and marks client messages as read. */
  async getClientThread(ownerId: string, eventId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('client_messages')
      .select('id, event_id, owner_id, client_id, sender_type, content, is_read, created_at')
      .eq('owner_id', ownerId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error('getClientThread error', error.message);
      return [];
    }

    // Mark unread client messages as read
    const unreadIds = (data || [])
      .filter((m: any) => m.sender_type === 'client' && !m.is_read)
      .map((m: any) => m.id);

    if (unreadIds.length) {
      await supabase
        .from('client_messages')
        .update({ is_read: true })
        .in('id', unreadIds);
    }

    return data || [];
  }

  /** Owner sends a message to the client for a specific event. */
  async sendClientMessage(ownerId: string, eventId: string, content: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Resolve the client_id from existing messages in this thread
    const { data: existing } = await supabase
      .from('client_messages')
      .select('client_id')
      .eq('owner_id', ownerId)
      .eq('event_id', eventId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      // No prior messages — look up client via intake_form linked to event
      const { data: ev } = await supabase
        .from('event')
        .select('intake_form_id')
        .eq('id', eventId)
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (!ev?.intake_form_id) {
        throw new BadRequestException('Event not found or does not belong to this owner.');
      }

      // Use intake_form id as client_id (consistent with client-auth.service derivation)
      const { data, error } = await supabase
        .from('client_messages')
        .insert([{
          event_id: eventId,
          owner_id: ownerId,
          client_id: ev.intake_form_id,
          sender_type: 'owner',
          content,
        }])
        .select()
        .single();

      if (error) {
        this.logger.error('sendClientMessage (new thread) error', error.message);
        throw new Error('Failed to send message.');
      }
      return data;
    }

    const { data, error } = await supabase
      .from('client_messages')
      .insert([{
        event_id: eventId,
        owner_id: ownerId,
        client_id: existing.client_id,
        sender_type: 'owner',
        content,
      }])
      .select()
      .single();

    if (error) {
      this.logger.error('sendClientMessage error', error.message);
      throw new Error('Failed to send message.');
    }
    return data;
  }

  /** Total unread client-message count for the owner (for nav badge). */
  async getClientInboxUnreadCount(ownerId: string): Promise<number> {
    const supabase = this.supabaseService.getAdminClient();
    const { count, error } = await supabase
      .from('client_messages')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('sender_type', 'client')
      .eq('is_read', false);

    if (error) {
      this.logger.error('getClientInboxUnreadCount error', error.message);
      return 0;
    }
    return count || 0;
  }
}
