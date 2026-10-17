import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuditLogEntry {
  actor_user_id: string;
  owner_account_id?: string | null;
  action: string; // e.g. 'invoice.created', 'contract.signed', 'event.updated'
  entity_type: string; // e.g. 'invoice', 'contract', 'event'
  entity_id?: string | null;
  metadata?: Record<string, any>;
  ip_address?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Log an auditable action.
   * Non-fatal: errors are logged but never thrown to avoid disrupting the caller.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const admin = this.supabaseService.getAdminClient();
      const { error } = await admin.from('activity_log').insert({
        actor_user_id: entry.actor_user_id,
        owner_account_id: entry.owner_account_id ?? null,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id ?? null,
        metadata: entry.metadata ?? {},
        ip_address: entry.ip_address ?? null,
        created_at: new Date().toISOString(),
      });
      if (error) {
        this.logger.error(
          `AuditService: failed to log "${entry.action}" — ${error.message}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `AuditService: exception logging "${entry.action}" — ${err.message}`,
      );
    }
  }

  /**
   * Query audit log for a specific owner account.
   * Returns the 100 most recent entries.
   */
  async getLog(ownerAccountId: string, limit = 100) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('activity_log')
      .select(
        'id, actor_user_id, action, entity_type, entity_id, metadata, ip_address, created_at, actor:users(first_name, last_name, email)',
      )
      .eq('owner_account_id', ownerAccountId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Record a successful login: bumps the user's login_count/last_sign_in_at
   * and writes a full-history activity_log row. Call this from every login
   * flow (owner/vendor/admin/unified/legacy) right after signInWithPassword
   * succeeds. Non-fatal — never throws, so a logging failure can't block login.
   */
  async recordLogin(
    userId: string,
    ownerAccountId: string | null,
    method: string,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    try {
      const { data: userRow } = await admin
        .from('users')
        .select('login_count')
        .eq('id', userId)
        .maybeSingle();

      const { error } = await admin
        .from('users')
        .update({
          last_sign_in_at: new Date().toISOString(),
          login_count: (userRow?.login_count ?? 0) + 1,
        })
        .eq('id', userId);

      if (error) {
        this.logger.error(
          `AuditService: failed to update login stats for ${userId} — ${error.message}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `AuditService: exception updating login stats for ${userId} — ${err.message}`,
      );
    }

    await this.log({
      actor_user_id: userId,
      owner_account_id: ownerAccountId,
      action: 'auth.login',
      entity_type: 'user',
      entity_id: userId,
      metadata: { method },
    });
  }
}
