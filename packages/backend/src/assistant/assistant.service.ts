import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AssistantSummary,
  RECENT_DAYS,
  UPCOMING_DAYS,
  buildAssistantSummary,
} from './assistant-summary';
import { generateNarrative, narrativeInput } from './assistant-narrative';

const NARRATIVE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly narrativeCache = new Map<
    string,
    { hash: string; text: string | null; at: number }
  >();

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Everything the assistant reports comes from the signed-in owner's own records. */
  async getSummary(userId: string): Promise<AssistantSummary> {
    const admin = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + UPCOMING_DAYS * 86400000)
      .toISOString()
      .slice(0, 10);

    const since = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString();

    const [
      events,
      invoices,
      estimates,
      contracts,
      leads,
      paidInvoices,
      signedContracts,
    ] = await Promise.all([
      admin
        .from('event')
        .select(
          'id, name, date, start_time, status, deposit_paid, deposit_amount, intake_form_id',
        )
        .eq('owner_id', userId)
        .gte('date', today)
        .lte('date', horizon)
        .order('date', { ascending: true })
        .limit(50),
      // Exclude by status rather than listing the open ones so an older status enum can't break the query.
      admin
        .from('invoices')
        .select('*')
        .eq('owner_id', userId)
        .neq('status', 'paid')
        .neq('status', 'cancelled')
        .limit(500),
      admin
        .from('estimates')
        .select(
          'id, estimate_number, client_name, status, total_amount, issue_date, expiration_date',
        )
        .eq('owner_id', userId)
        .in('status', ['draft', 'sent', 'approved'])
        .limit(500),
      admin
        .from('contracts')
        .select(
          'id, contract_number, title, client_name, status, sent_date, event_id, intake_form_id',
        )
        .eq('owner_id', userId)
        .in('status', ['draft', 'sent'])
        .limit(500),
      admin
        .from('intake_forms')
        .select('id, contact_name, event_type, event_date, created_at')
        .eq('user_id', userId)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(500),
      admin
        .from('invoices')
        .select('id, invoice_number, client_name, total_amount, paid_date')
        .eq('owner_id', userId)
        .eq('status', 'paid')
        .gte('paid_date', since)
        .order('paid_date', { ascending: false })
        .limit(20),
      admin
        .from('contracts')
        .select('id, title, client_name, signed_date')
        .eq('owner_id', userId)
        .eq('status', 'signed')
        .gte('signed_date', since)
        .order('signed_date', { ascending: false })
        .limit(20),
    ]);

    for (const [name, result] of Object.entries({
      events,
      invoices,
      estimates,
      contracts,
      leads,
      paidInvoices,
      signedContracts,
    })) {
      if (result.error)
        this.logger.warn(
          `Assistant ${name} query failed: ${result.error.message}`,
        );
    }

    return buildAssistantSummary({
      today,
      events: events.data ?? [],
      invoices: invoices.data ?? [],
      estimates: estimates.data ?? [],
      contracts: contracts.data ?? [],
      leads: leads.data ?? [],
      recent: {
        paidInvoices: paidInvoices.data ?? [],
        signedContracts: signedContracts.data ?? [],
      },
    });
  }

  /** AI-written note for the summary; null when AI is not configured or unavailable. */
  async getNarrative(userId: string): Promise<string | null> {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) return null;

    const summary = await this.getSummary(userId);
    const hash = createHash('sha256')
      .update(JSON.stringify(narrativeInput(summary)))
      .digest('hex');

    const cached = this.narrativeCache.get(userId);
    if (
      cached &&
      cached.hash === hash &&
      Date.now() - cached.at < NARRATIVE_TTL_MS
    ) {
      return cached.text;
    }

    const text = await generateNarrative(summary, {
      apiKey,
      model: process.env.AI_ASSISTANT_MODEL,
    });
    if (this.narrativeCache.size >= MAX_CACHE_ENTRIES) {
      this.narrativeCache.delete(
        this.narrativeCache.keys().next().value as string,
      );
    }
    this.narrativeCache.set(userId, { hash, text, at: Date.now() });
    return text;
  }
}
