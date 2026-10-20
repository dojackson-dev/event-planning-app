import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const MESSAGE_TYPES = [
  'reminder',
  'invoice',
  'confirmation',
  'update',
  'custom',
] as const;
const RECIPIENT_TYPES = ['client', 'guest', 'security', 'all'] as const;

export class MessageTemplateInput {
  name?: string;
  messageType?: string;
  content?: string;
  recipientType?: string;
  sendBeforeDays?: number | null;
  sendTime?: string | null;
  repeatIntervalDays?: number | null;
  autoSend?: boolean;
  isActive?: boolean;
}

@Injectable()
export class MessageTemplatesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private toApi(row: any) {
    return {
      id: row.id,
      name: row.name,
      messageType: row.message_type,
      content: row.content,
      recipientType: row.recipient_type,
      sendBeforeDays: row.send_before_days,
      sendTime: row.send_time,
      repeatIntervalDays: row.repeat_interval_days,
      autoSend: row.auto_send,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private optionalInt(value: unknown, field: string): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0)
      throw new BadRequestException(`${field} must be a whole number`);
    return n;
  }

  /** Validates the camelCase payload and maps it to columns; only fields present are returned. */
  private toRow(input: MessageTemplateInput, partial: boolean) {
    const row: Record<string, unknown> = {};
    if (!partial || input.name !== undefined) {
      if (!input.name?.trim())
        throw new BadRequestException('name is required');
      row.name = input.name.trim();
    }
    if (!partial || input.content !== undefined) {
      if (!input.content?.trim())
        throw new BadRequestException('content is required');
      row.content = input.content;
    }
    if (!partial || input.messageType !== undefined) {
      if (!MESSAGE_TYPES.includes(input.messageType as never))
        throw new BadRequestException('invalid messageType');
      row.message_type = input.messageType;
    }
    if (!partial || input.recipientType !== undefined) {
      if (!RECIPIENT_TYPES.includes(input.recipientType as never))
        throw new BadRequestException('invalid recipientType');
      row.recipient_type = input.recipientType;
    }
    if (input.sendBeforeDays !== undefined)
      row.send_before_days = this.optionalInt(
        input.sendBeforeDays,
        'sendBeforeDays',
      );
    if (input.repeatIntervalDays !== undefined)
      row.repeat_interval_days = this.optionalInt(
        input.repeatIntervalDays,
        'repeatIntervalDays',
      );
    if (input.sendTime !== undefined) {
      if (input.sendTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.sendTime))
        throw new BadRequestException('sendTime must be HH:MM');
      row.send_time = input.sendTime || null;
    }
    if (input.autoSend !== undefined) row.auto_send = !!input.autoSend;
    if (input.isActive !== undefined) row.is_active = !!input.isActive;
    return row;
  }

  async findAll(ownerAccountId: string, activeOnly = false) {
    const admin = this.supabaseService.getAdminClient();
    let query = admin
      .from('message_templates')
      .select('*')
      .eq('owner_account_id', ownerAccountId)
      .order('created_at', { ascending: false });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map((r) => this.toApi(r));
  }

  async findOne(ownerAccountId: string, id: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('owner_account_id', ownerAccountId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Template not found');
    return this.toApi(data);
  }

  async create(ownerAccountId: string, input: MessageTemplateInput) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('message_templates')
      .insert({ ...this.toRow(input, false), owner_account_id: ownerAccountId })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return this.toApi(data);
  }

  async update(
    ownerAccountId: string,
    id: string,
    input: MessageTemplateInput,
  ) {
    await this.findOne(ownerAccountId, id);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('message_templates')
      .update(this.toRow(input, true))
      .eq('id', id)
      .eq('owner_account_id', ownerAccountId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return this.toApi(data);
  }

  async toggleActive(ownerAccountId: string, id: string) {
    const current = await this.findOne(ownerAccountId, id);
    return this.update(ownerAccountId, id, { isActive: !current.isActive });
  }

  async remove(ownerAccountId: string, id: string) {
    await this.findOne(ownerAccountId, id);
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin
      .from('message_templates')
      .delete()
      .eq('id', id)
      .eq('owner_account_id', ownerAccountId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
