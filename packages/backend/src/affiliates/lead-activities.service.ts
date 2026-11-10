import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LeadAgent, LeadsService, isMissingSchema } from './leads.service';
import {
  ATTACHMENT_BUCKET,
  UUID_RE,
  normalizeFollowUp,
} from './lead-validation';

export interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const ACTIVITY_TYPES = ['note', 'call', 'email', 'sms', 'meeting'];
/** Activity types that count as having reached out to the lead. */
const CONTACT_TYPES = ['call', 'email', 'sms', 'meeting'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_LEAD = 20;
const ATTACHMENT_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    'docx',
  ],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
};

export interface ActivityView {
  id: string;
  type: string;
  direction: string | null;
  subject: string | null;
  body: string | null;
  outcome: string | null;
  by_name: string | null;
  created_at: string;
}

export interface AttachmentView {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  by_name: string | null;
  created_at: string;
}

type Person = { first_name: string | null; last_name: string | null } | null;

function personName(person: Person | undefined): string | null {
  if (!person) return null;
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || null;
}

function optional(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} must be text.`);
  }
  const text = value.trim();
  if (text.length > max) {
    throw new BadRequestException(
      `${label} must be ${max} characters or fewer.`,
    );
  }
  return text || null;
}

@Injectable()
export class LeadActivitiesService {
  private readonly logger = new Logger(LeadActivitiesService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly leads: LeadsService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private fail(what: string, error: { message: string; code?: string }): never {
    this.logger.error(`${what}: ${error.message}`);
    throw new ServiceUnavailableException(
      isMissingSchema(error)
        ? 'Lead tools are being upgraded. Please try again later.'
        : 'Please try again shortly.',
    );
  }

  // ─── Activity log (calls, emails, texts, meetings, notes) ────────────────

  async list(
    id: string,
    agent: LeadAgent,
  ): Promise<{ activities: ActivityView[] }> {
    await this.leads.assertAccess(id, agent);
    const { data, error } = await this.db
      .from('lead_activities')
      .select(
        'id, type, direction, subject, body, outcome, created_at, by:affiliates!affiliate_id(first_name, last_name)',
      )
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) this.fail('Lead activity list failed', error);
    return {
      activities: (
        (data ?? []) as unknown as Array<
          Omit<ActivityView, 'by_name'> & { by?: Person }
        >
      ).map(({ by, ...rest }) => ({ ...rest, by_name: personName(by) })),
    };
  }

  async add(
    id: string,
    agent: LeadAgent,
    body: Record<string, unknown>,
  ): Promise<ActivityView> {
    await this.leads.assertAccess(id, agent);
    const type = body.type;
    if (typeof type !== 'string' || !ACTIVITY_TYPES.includes(type)) {
      throw new BadRequestException(
        `Type must be one of: ${ACTIVITY_TYPES.join(', ')}.`,
      );
    }
    const subject = optional(body.subject, 'Subject', 200);
    const text = optional(body.body, 'Details', 4000);
    const outcome = optional(body.outcome, 'Outcome', 100);
    if (!subject && !text && !outcome) {
      throw new BadRequestException('Add some details to log.');
    }
    let direction: string | null = null;
    if (
      body.direction !== undefined &&
      body.direction !== null &&
      body.direction !== ''
    ) {
      if (body.direction !== 'outbound' && body.direction !== 'inbound') {
        throw new BadRequestException('Direction must be outbound or inbound.');
      }
      direction = body.direction;
    }
    const followUp = normalizeFollowUp(body.follow_up_at);

    const { data, error } = await this.db
      .from('lead_activities')
      .insert({
        lead_id: id,
        affiliate_id: agent.id,
        type,
        direction,
        subject,
        body: text,
        outcome,
      })
      .select(
        'id, type, direction, subject, body, outcome, created_at, by:affiliates!affiliate_id(first_name, last_name)',
      )
      .single();
    if (error) this.fail('Lead activity create failed', error);

    const patch: Record<string, unknown> = {};
    if (CONTACT_TYPES.includes(type))
      patch.last_contacted_at = new Date().toISOString();
    if (body.follow_up_at !== undefined) patch.next_follow_up_at = followUp;
    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await this.db
        .from('demo_requests')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (patchError) {
        this.logger.warn(
          `Could not update lead follow-up: ${patchError.message}`,
        );
      }
    }

    const { by, ...rest } = data as unknown as Omit<ActivityView, 'by_name'> & {
      by?: Person;
    };
    return { ...rest, by_name: personName(by) };
  }

  // ─── Attachments ─────────────────────────────────────────────────────────

  async listAttachments(
    id: string,
    agent: LeadAgent,
  ): Promise<{ attachments: AttachmentView[] }> {
    await this.leads.assertAccess(id, agent);
    const { data, error } = await this.db
      .from('lead_attachments')
      .select(
        'id, file_name, mime_type, size_bytes, created_at, by:affiliates!affiliate_id(first_name, last_name)',
      )
      .eq('lead_id', id)
      .order('created_at', { ascending: false });
    if (error) this.fail('Lead attachment list failed', error);
    return {
      attachments: (
        (data ?? []) as unknown as Array<
          Omit<AttachmentView, 'by_name'> & { by?: Person }
        >
      ).map(({ by, ...rest }) => ({ ...rest, by_name: personName(by) })),
    };
  }

  private async ensureBucket(): Promise<void> {
    const storage = this.db.storage;
    const { error } = await storage.getBucket(ATTACHMENT_BUCKET);
    if (!error) return;
    const { error: createError } = await storage.createBucket(
      ATTACHMENT_BUCKET,
      {
        public: false,
      },
    );
    if (createError && !/already exists/i.test(createError.message)) {
      this.fail('Lead attachment bucket failed', createError);
    }
  }

  async addAttachment(
    id: string,
    agent: LeadAgent,
    file: MulterFile | undefined,
  ): Promise<AttachmentView> {
    await this.leads.assertAccess(id, agent);
    if (!file) throw new BadRequestException('Choose a file to attach.');
    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ATTACHMENT_TYPES[file.mimetype];
    if (!allowed || !allowed.includes(extension)) {
      throw new BadRequestException(
        'Unsupported file type. Use PDF, Word, Excel, an image, CSV or TXT.',
      );
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('Files must be 10 MB or smaller.');
    }

    const { count, error: countError } = await this.db
      .from('lead_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', id);
    if (countError) this.fail('Lead attachment count failed', countError);
    if ((count ?? 0) >= MAX_ATTACHMENTS_PER_LEAD) {
      throw new BadRequestException(
        `A lead can have up to ${MAX_ATTACHMENTS_PER_LEAD} attachments.`,
      );
    }

    await this.ensureBucket();
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '')
      .slice(-100);
    const path = `${id}/${Date.now()}-${safeName || 'file'}`;
    const { error: uploadError } = await this.db.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadError) this.fail('Lead attachment upload failed', uploadError);

    const { data, error } = await this.db
      .from('lead_attachments')
      .insert({
        lead_id: id,
        affiliate_id: agent.id,
        file_name: safeName || 'file',
        storage_path: path,
        mime_type: file.mimetype,
        size_bytes: file.size,
      })
      .select(
        'id, file_name, mime_type, size_bytes, created_at, by:affiliates!affiliate_id(first_name, last_name)',
      )
      .single();
    if (error) {
      await this.db.storage.from(ATTACHMENT_BUCKET).remove([path]);
      this.fail('Lead attachment save failed', error);
    }
    const { by, ...rest } = data as unknown as Omit<
      AttachmentView,
      'by_name'
    > & {
      by?: Person;
    };
    return { ...rest, by_name: personName(by) };
  }

  private async loadAttachment(
    id: string,
    attachmentId: string,
    agent: LeadAgent,
  ): Promise<{ id: string; file_name: string; storage_path: string }> {
    await this.leads.assertAccess(id, agent);
    if (!UUID_RE.test(attachmentId ?? '')) {
      throw new NotFoundException('Attachment not found.');
    }
    const { data, error } = await this.db
      .from('lead_attachments')
      .select('id, file_name, storage_path')
      .eq('id', attachmentId)
      .eq('lead_id', id)
      .maybeSingle();
    if (error) this.fail('Lead attachment lookup failed', error);
    if (!data) throw new NotFoundException('Attachment not found.');
    return data as { id: string; file_name: string; storage_path: string };
  }

  /** A short-lived signed link; the bucket itself is private. */
  async attachmentUrl(
    id: string,
    attachmentId: string,
    agent: LeadAgent,
  ): Promise<{ url: string }> {
    const attachment = await this.loadAttachment(id, attachmentId, agent);
    const { data, error } = await this.db.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(attachment.storage_path, 300, {
        download: attachment.file_name,
      });
    if (error || !data)
      this.fail('Lead attachment link failed', error ?? { message: 'no url' });
    return { url: data.signedUrl };
  }

  async removeAttachment(
    id: string,
    attachmentId: string,
    agent: LeadAgent,
  ): Promise<{ deleted: true }> {
    const attachment = await this.loadAttachment(id, attachmentId, agent);
    const { error } = await this.db
      .from('lead_attachments')
      .delete()
      .eq('id', attachment.id);
    if (error) this.fail('Lead attachment delete failed', error);
    try {
      await this.db.storage
        .from(ATTACHMENT_BUCKET)
        .remove([attachment.storage_path]);
    } catch (err) {
      this.logger.warn(`Could not remove attachment file: ${String(err)}`);
    }
    return { deleted: true };
  }
}
