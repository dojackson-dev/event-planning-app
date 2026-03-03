import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TrialService {
  private readonly logger = new Logger(TrialService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get the default free trial days from app settings
   */
  async getDefaultTrialDays(): Promise<number> {
    try {
      const admin = this.supabaseService.getAdminClient();
      const { data } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', 'FREE_TRIAL_DAYS')
        .single();

      return data ? parseInt(data.value, 10) : 30;
    } catch (error) {
      this.logger.warn('Failed to get trial days, using default 30');
      return 30;
    }
  }

  /**
   * Set the default free trial days
   */
  async setDefaultTrialDays(days: number): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('app_settings')
      .upsert({ key: 'FREE_TRIAL_DAYS', value: days.toString() })
      .eq('key', 'FREE_TRIAL_DAYS');

    this.logger.log(`Free trial days set to ${days}`);
  }

  /**
   * Create a trial for a new owner
   */
  async createTrial(ownerAccountId: string, trialDays?: number): Promise<Date> {
    const days = trialDays || (await this.getDefaultTrialDays());
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('owner_accounts')
      .update({
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_status: 'trial',
      })
      .eq('id', ownerAccountId);

    this.logger.log(`Trial created for owner ${ownerAccountId}, expires at ${trialEndsAt}`);
    return trialEndsAt;
  }

  /**
   * Check if an owner's trial is still active
   */
  async isTrialActive(ownerAccountId: string): Promise<boolean> {
    const admin = this.supabaseService.getAdminClient();
    const { data: owner } = await admin
      .from('owner_accounts')
      .select('trial_ends_at, subscription_status')
      .eq('id', ownerAccountId)
      .single();

    if (!owner || owner.subscription_status !== 'trial') {
      return false;
    }

    if (!owner.trial_ends_at) {
      return false;
    }

    const now = new Date();
    const trialEnds = new Date(owner.trial_ends_at);
    return now < trialEnds;
  }

  /**
   * Get trial info for an owner
   */
  async getTrialInfo(
    ownerAccountId: string,
  ): Promise<{
    isActive: boolean;
    endsAt: Date | null;
    daysRemaining: number | null;
  }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: owner } = await admin
      .from('owner_accounts')
      .select('trial_ends_at, subscription_status')
      .eq('id', ownerAccountId)
      .single();

    if (!owner || owner.subscription_status !== 'trial' || !owner.trial_ends_at) {
      return {
        isActive: false,
        endsAt: null,
        daysRemaining: null,
      };
    }

    const now = new Date();
    const trialEnds = new Date(owner.trial_ends_at);
    const isActive = now < trialEnds;
    const daysRemaining = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isActive,
      endsAt: trialEnds,
      daysRemaining: isActive ? daysRemaining : 0,
    };
  }
}
