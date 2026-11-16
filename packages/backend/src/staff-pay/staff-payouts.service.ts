import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { PayMethod, processingFeeLine } from '../payments/platform-fee';
import {
  MAX_PAYOUT_CENTS,
  MIN_PAYOUT_CENTS,
  STALE_PENDING_MS,
  accountReadyForTransfers,
  parseServiceFeePercent,
  quotePayout,
  toCents,
} from './staff-payout-rules';

const TOKEN_RE = /^[0-9a-f]{32}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const PAYABLE_SELECT =
  'id, title, shift_date, approved_amount, staff_member_id, staff_members(id, name, phone, payout_status, stripe_account_id)';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

@Injectable()
export class StaffPayoutsService {
  private readonly logger = new Logger(StaffPayoutsService.name);
  private readonly stripe: Stripe | null;
  private readonly frontendUrl: string;
  private readonly serviceFeePercent: number;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly sms: SmsNotificationsService,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
    this.frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      'https://www.eventecos.com'
    ).replace(/\/+$/, '');
    this.serviceFeePercent = parseServiceFeePercent(
      this.configService.get<string>('STAFF_PAY_SERVICE_FEE_PERCENT'),
    );
  }

  private get admin() {
    return this.supabaseService.getAdminClient();
  }

  private get client(): Stripe {
    if (!this.stripe)
      throw new ServiceUnavailableException('Payments are not set up yet.');
    return this.stripe;
  }

  // ── Worker payout setup (public pages, the secret link is the credential) ──

  /** Texts the worker a link to connect their bank. The venue never sees or handles bank details. */
  async sendSetupLink(ownerId: string, memberId: string) {
    if (!UUID_RE.test(memberId))
      throw new NotFoundException('Staff member not found');
    const { data: member } = await this.admin
      .from('staff_members')
      .select('*')
      .eq('id', memberId)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!member) throw new NotFoundException('Staff member not found');
    if (member.payout_status === 'ready')
      throw new ConflictException('This person is already set up to be paid.');

    const token = member.payout_setup_token ?? randomBytes(16).toString('hex');
    await this.admin
      .from('staff_members')
      .update({
        payout_setup_token: token,
        payout_setup_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    const link = `${this.frontendUrl}/payout-setup/${token}`;
    const { data: owner } = await this.admin
      .from('owner_accounts')
      .select('business_name')
      .eq('primary_owner_id', ownerId)
      .maybeSingle();
    const first = String(member.name).split(' ')[0];
    const texted = await this.sms.sendOne(
      member.phone,
      `Eventecos Pay\nHi ${first}, ${owner?.business_name ?? 'your venue'} pays you through Eventecos. Set up where to send your pay (about 3 minutes): ${link}`,
    );
    return { texted, link };
  }

  private async memberByToken(token: string) {
    if (!TOKEN_RE.test(token ?? ''))
      throw new NotFoundException('This link is not valid.');
    const { data } = await this.admin
      .from('staff_members')
      .select('*')
      .eq('payout_setup_token', token)
      .maybeSingle();
    if (!data) throw new NotFoundException('This link is not valid.');
    return data;
  }

  /** Checks Stripe for the worker's account and saves whether they can be paid yet. */
  private async syncMember(member: any): Promise<string> {
    if (!member.stripe_account_id) return 'not_connected';
    const account = await this.client.accounts.retrieve(
      member.stripe_account_id,
    );
    return this.applyAccount(member.id, member.payout_status, account);
  }

  private async applyAccount(
    memberId: string,
    current: string,
    account: Stripe.Account,
  ): Promise<string> {
    const status = accountReadyForTransfers(account) ? 'ready' : 'pending';
    if (status !== current) {
      await this.admin
        .from('staff_members')
        .update({ payout_status: status, updated_at: new Date().toISOString() })
        .eq('id', memberId);
    }
    return status;
  }

  /** account.updated webhook for a worker's connected account. Returns false if it is not a worker's. */
  async handleAccountUpdated(account: Stripe.Account): Promise<boolean> {
    const memberId = account.metadata?.staff_member_id;
    if (!memberId || !UUID_RE.test(memberId)) return false;
    const { data: member } = await this.admin
      .from('staff_members')
      .select('id, payout_status, stripe_account_id')
      .eq('id', memberId)
      .maybeSingle();
    if (!member || member.stripe_account_id !== account.id) return false;
    await this.applyAccount(member.id, member.payout_status, account);
    return true;
  }

  async setupView(token: string) {
    const member = await this.memberByToken(token);
    let status = member.payout_status as string;
    try {
      status = await this.syncMember(member);
    } catch (err) {
      this.logger.warn(
        `Could not check payout account for staff ${member.id}: ${(err as Error).message}`,
      );
    }
    return {
      worker_first_name: String(member.name).split(' ')[0],
      status,
    };
  }

  /** Creates the worker's Stripe account on first use and returns Stripe's own onboarding page. */
  async startSetup(token: string) {
    const member = await this.memberByToken(token);
    let accountId: string | null = member.stripe_account_id;
    if (!accountId) {
      const account = await this.client.accounts.create(
        {
          type: 'express',
          business_type: 'individual',
          ...(member.email ? { email: member.email } : {}),
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            url: this.frontendUrl,
            product_description: 'Event staff services',
          },
          metadata: { staff_member_id: member.id },
        },
        { idempotencyKey: `staff-account-${member.id}` },
      );
      accountId = account.id;
      await this.admin
        .from('staff_members')
        .update({
          stripe_account_id: accountId,
          payout_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);
    }
    const back = `${this.frontendUrl}/payout-setup/${token}`;
    const link = await this.client.accountLinks.create({
      account: accountId,
      refresh_url: back,
      return_url: `${back}?returned=1`,
      type: 'account_onboarding',
    });
    return { url: link.url };
  }

  // ── Paying approved shifts ─────────────────────────────────────

  private async ownerAccount(ownerId: string) {
    const { data } = await this.admin
      .from('owner_accounts')
      .select('enable_bnpl')
      .eq('primary_owner_id', ownerId)
      .maybeSingle();
    return data;
  }

  private async payableShifts(ownerId: string): Promise<any[]> {
    const { data, error } = await this.admin
      .from('staff_shifts')
      .select(PAYABLE_SELECT)
      .eq('owner_id', ownerId)
      .eq('status', 'approved')
      .is('payout_id', null)
      .order('shift_date', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).filter((s: any) => toCents(s.approved_amount) > 0);
  }

  /** What a payment would cover today: who is ready, who still needs to connect a bank, and the cost. */
  async preview(ownerId: string) {
    await this.releaseStale(ownerId);
    const shifts = await this.payableShifts(ownerId);
    const workers = new Map<string, any>();
    for (const s of shifts) {
      const m = s.staff_members;
      const w = workers.get(s.staff_member_id) ?? {
        staff_member_id: s.staff_member_id,
        name: m?.name ?? 'Staff',
        payout_status: m?.payout_status ?? 'not_connected',
        ready: m?.payout_status === 'ready' && !!m?.stripe_account_id,
        amount_cents: 0,
        shifts: [] as any[],
      };
      const cents = toCents(s.approved_amount);
      w.amount_cents += cents;
      w.shifts.push({
        id: s.id,
        title: s.title,
        shift_date: s.shift_date,
        amount_cents: cents,
      });
      workers.set(s.staff_member_id, w);
    }
    const list = [...workers.values()];
    const payable = list
      .filter((w) => w.ready)
      .reduce((sum, w) => sum + w.amount_cents, 0);
    const owner = await this.ownerAccount(ownerId);
    const quote = (method: PayMethod) =>
      payable >= MIN_PAYOUT_CENTS
        ? quotePayout(payable, method, this.serviceFeePercent)
        : null;

    const { data: open } = await this.admin
      .from('staff_payouts')
      .select('id, status, total_cents, created_at')
      .eq('owner_id', ownerId)
      .in('status', ['pending_payment', 'processing'])
      .order('created_at', { ascending: false });

    return {
      workers: list,
      payable_cents: payable,
      waiting_cents: list
        .filter((w) => !w.ready)
        .reduce((sum, w) => sum + w.amount_cents, 0),
      quotes: {
        card: quote('card'),
        bank: owner?.enable_bnpl ? quote('bank') : null,
      },
      open_payouts: open ?? [],
    };
  }

  /** Starts a payment for every approved shift whose worker is ready. Returns the Stripe checkout address. */
  async createCheckout(ownerId: string, input: { method?: unknown }) {
    await this.releaseStale(ownerId);
    const method: PayMethod = input?.method === 'bank' ? 'bank' : 'card';
    if (method === 'bank') {
      const owner = await this.ownerAccount(ownerId);
      if (!owner?.enable_bnpl)
        throw new BadRequestException(
          'Bank payment is not turned on for your account.',
        );
    }

    const shifts = (await this.payableShifts(ownerId)).filter(
      (s) =>
        s.staff_members?.payout_status === 'ready' &&
        s.staff_members?.stripe_account_id,
    );
    if (shifts.length === 0)
      throw new BadRequestException(
        'There are no approved shifts to pay yet, or the workers have not connected their bank.',
      );

    const payroll = shifts.reduce((n, s) => n + toCents(s.approved_amount), 0);
    if (payroll < MIN_PAYOUT_CENTS)
      throw new BadRequestException(
        `A payment must be at least ${money(MIN_PAYOUT_CENTS)}.`,
      );
    if (payroll > MAX_PAYOUT_CENTS)
      throw new BadRequestException(
        `A single payment is limited to ${money(MAX_PAYOUT_CENTS)}. Approve fewer shifts at a time.`,
      );
    const quote = quotePayout(payroll, method, this.serviceFeePercent);

    const { data: payout, error } = await this.admin
      .from('staff_payouts')
      .insert({
        owner_id: ownerId,
        status: 'pending_payment',
        pay_method: method,
        ...quote,
        total_cents: quote.total_cents,
      })
      .select('*')
      .single();
    if (error || !payout)
      throw new BadRequestException(
        error?.message ?? 'Could not start payment',
      );

    // Reserve the shifts first so two payments can never cover the same shift.
    const ids = shifts.map((s) => s.id);
    const { data: reserved } = await this.admin
      .from('staff_shifts')
      .update({ payout_id: payout.id, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('owner_id', ownerId)
      .eq('status', 'approved')
      .is('payout_id', null)
      .select('id');
    if ((reserved ?? []).length !== ids.length) {
      await this.cancelPayout(payout.id);
      throw new ConflictException(
        'Shifts changed while starting the payment. Try again.',
      );
    }
    const { error: itemsError } = await this.admin
      .from('staff_payout_items')
      .insert(
        shifts.map((s) => ({
          payout_id: payout.id,
          shift_id: s.id,
          staff_member_id: s.staff_member_id,
          amount_cents: toCents(s.approved_amount),
          status: 'pending',
          attempts: 0,
        })),
      );
    if (itemsError) {
      await this.cancelPayout(payout.id);
      throw new BadRequestException(itemsError.message);
    }

    const { data: user } = await this.admin
      .from('users')
      .select('email')
      .eq('id', ownerId)
      .maybeSingle();

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: 'usd',
            unit_amount: quote.payroll_cents,
            product_data: {
              name: 'Staff pay',
              description: `${shifts.length} approved shift${shifts.length === 1 ? '' : 's'}, paid to ${new Set(shifts.map((s) => s.staff_member_id)).size} worker(s)`,
            },
          },
          quantity: 1,
        },
      ];
      if (quote.service_fee_cents > 0)
        lineItems.push({
          price_data: {
            currency: 'usd',
            unit_amount: quote.service_fee_cents,
            product_data: { name: 'EventEcos service fee' },
          },
          quantity: 1,
        });
      if (quote.processing_fee_cents > 0)
        lineItems.push({
          price_data: {
            currency: 'usd',
            unit_amount: quote.processing_fee_cents,
            product_data: processingFeeLine(method),
          },
          quantity: 1,
        });

      const session = await this.client.checkout.sessions.create({
        mode: 'payment',
        payment_method_types:
          method === 'bank' ? ['us_bank_account'] : ['card'],
        line_items: lineItems,
        ...(user?.email ? { customer_email: user.email } : {}),
        success_url: `${this.frontendUrl}/dashboard/staff-pay?paid=1`,
        cancel_url: `${this.frontendUrl}/dashboard/staff-pay?canceled=1`,
        metadata: { staff_payout_id: payout.id },
        payment_intent_data: {
          transfer_group: `staff_payout_${payout.id}`,
          description: 'Staff pay',
          metadata: { staff_payout_id: payout.id },
        },
      });
      await this.admin
        .from('staff_payouts')
        .update({
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);
      return { url: session.url, payout_id: payout.id, ...quote };
    } catch (err) {
      await this.cancelPayout(payout.id);
      this.logger.error(
        `Staff payout checkout failed for owner ${ownerId}: ${(err as Error).message}`,
      );
      throw new BadRequestException(
        'We could not start the payment. Nothing was charged. Please try again.',
      );
    }
  }

  /** Frees the shifts of a payment that will not happen so they can be paid another way. */
  private async cancelPayout(payoutId: string) {
    await this.admin
      .from('staff_payouts')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', payoutId)
      .in('status', ['pending_payment', 'processing']);
    await this.admin
      .from('staff_shifts')
      .update({ payout_id: null, updated_at: new Date().toISOString() })
      .eq('payout_id', payoutId)
      .eq('status', 'approved');
  }

  /** Releases checkouts that were started but never paid. */
  private async releaseStale(ownerId: string) {
    const cutoff = new Date(Date.now() - STALE_PENDING_MS).toISOString();
    const { data: stale } = await this.admin
      .from('staff_payouts')
      .select('id, stripe_checkout_session_id')
      .eq('owner_id', ownerId)
      .eq('status', 'pending_payment')
      .lte('created_at', cutoff);
    for (const p of stale ?? []) {
      if (p.stripe_checkout_session_id) {
        try {
          await this.client.checkout.sessions.expire(
            p.stripe_checkout_session_id,
          );
        } catch {
          // Already expired or paid; a paid one is settled by its webhook, so leave it alone.
          const s = await this.client.checkout.sessions
            .retrieve(p.stripe_checkout_session_id)
            .catch(() => null);
          if (s && s.status === 'complete') continue;
        }
      }
      await this.cancelPayout(p.id);
    }
  }

  async cancel(ownerId: string, payoutId: string) {
    const payout = await this.ownPayout(ownerId, payoutId);
    if (payout.status !== 'pending_payment')
      throw new ConflictException(
        payout.status === 'cancelled'
          ? 'This payment was already cancelled.'
          : 'This payment can no longer be cancelled.',
      );
    if (payout.stripe_checkout_session_id) {
      try {
        await this.client.checkout.sessions.expire(
          payout.stripe_checkout_session_id,
        );
      } catch {
        const s = await this.client.checkout.sessions
          .retrieve(payout.stripe_checkout_session_id)
          .catch(() => null);
        if (s?.status === 'complete')
          throw new ConflictException(
            'The payment has already gone through, so it cannot be cancelled.',
          );
      }
    }
    await this.cancelPayout(payoutId);
    return { success: true };
  }

  private async ownPayout(ownerId: string, id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundException('Payment not found');
    const { data } = await this.admin
      .from('staff_payouts')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Payment not found');
    return data;
  }

  async list(ownerId: string) {
    const { data, error } = await this.admin
      .from('staff_payouts')
      .select(
        '*, staff_payout_items(id, amount_cents, status, error, staff_member_id, shift_id)',
      )
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ── Stripe webhooks ────────────────────────────────────────────

  private async payoutForSession(session: Stripe.Checkout.Session) {
    const id = session.metadata?.staff_payout_id;
    if (!id || !UUID_RE.test(id)) return null;
    const { data } = await this.admin
      .from('staff_payouts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    // The checkout must be the one this payment created, not just carry its id in metadata.
    if (!data || data.stripe_checkout_session_id !== session.id) return null;
    return data;
  }

  private paymentIntentId(session: Stripe.Checkout.Session): string | null {
    return typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  }

  async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const payout = await this.payoutForSession(session);
    if (!payout) return;
    if (session.payment_status === 'paid') {
      await this.settle(payout.id, this.paymentIntentId(session));
      return;
    }
    // Bank debits are not paid yet: hold the shifts until the money clears.
    await this.admin
      .from('staff_payouts')
      .update({
        status: 'processing',
        stripe_payment_intent_id: this.paymentIntentId(session),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payout.id)
      .eq('status', 'pending_payment');
  }

  async onAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
    const payout = await this.payoutForSession(session);
    if (payout) await this.settle(payout.id, this.paymentIntentId(session));
  }

  /** Checkout expired or the bank debit failed: nothing was collected, so free the shifts. */
  async onPaymentFailed(session: Stripe.Checkout.Session) {
    const payout = await this.payoutForSession(session);
    if (payout) await this.cancelPayout(payout.id);
  }

  /** The venue's money is in: claim the payment once, then pay each worker. */
  private async settle(payoutId: string, paymentIntentId: string | null) {
    const { data: claimed } = await this.admin
      .from('staff_payouts')
      .update({
        status: 'transferring',
        stripe_payment_intent_id: paymentIntentId,
        paid_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId)
      .in('status', ['pending_payment', 'processing'])
      .select('id');
    // Stripe sends both events for some payments; the second finds it already claimed.
    if (!claimed?.length) return;

    if (paymentIntentId) {
      try {
        const pi = await this.client.paymentIntents.retrieve(paymentIntentId);
        const charge =
          typeof pi.latest_charge === 'string'
            ? pi.latest_charge
            : (pi.latest_charge?.id ?? null);
        await this.admin
          .from('staff_payouts')
          .update({ stripe_charge_id: charge })
          .eq('id', payoutId);
      } catch (err) {
        this.logger.warn(
          `Could not read the charge for payout ${payoutId}: ${(err as Error).message}`,
        );
      }
    }
    await this.runTransfers(payoutId);
  }

  async retry(ownerId: string, payoutId: string) {
    const payout = await this.ownPayout(ownerId, payoutId);
    if (payout.status !== 'needs_attention')
      throw new ConflictException('Nothing to retry on this payment.');
    const { data: claimed } = await this.admin
      .from('staff_payouts')
      .update({ status: 'transferring', updated_at: new Date().toISOString() })
      .eq('id', payoutId)
      .eq('status', 'needs_attention')
      .select('id');
    if (!claimed?.length)
      throw new ConflictException('This payment is already being retried.');
    await this.runTransfers(payoutId);
    return this.ownPayout(ownerId, payoutId);
  }

  /** Sends each unpaid item's money to its worker, tied to the venue's charge. Safe to run again. */
  private async runTransfers(payoutId: string) {
    const { data: payout } = await this.admin
      .from('staff_payouts')
      .select('*')
      .eq('id', payoutId)
      .maybeSingle();
    if (!payout) return;
    const { data: items } = await this.admin
      .from('staff_payout_items')
      .select(
        '*, staff_members(id, name, phone, stripe_account_id), staff_shifts(title, shift_date)',
      )
      .eq('payout_id', payoutId)
      .in('status', ['pending', 'failed']);

    // A transfer that went out but was not recorded (a crash after Stripe replied) must not be sent twice.
    const sent = new Map<string, string>();
    try {
      const existing = await this.client.transfers.list({
        transfer_group: `staff_payout_${payoutId}`,
        limit: 100,
      });
      for (const t of existing.data) {
        const itemId = t.metadata?.staff_payout_item_id;
        if (itemId) sent.set(itemId, t.id);
      }
    } catch (err) {
      this.logger.warn(
        `Could not list transfers for payout ${payoutId}: ${(err as Error).message}`,
      );
    }

    for (const item of items ?? []) {
      const destination = item.staff_members?.stripe_account_id;
      try {
        let transferId = sent.get(item.id) ?? null;
        if (!transferId) {
          if (!destination)
            throw new Error('This worker has no connected account.');
          await this.admin
            .from('staff_payout_items')
            .update({ attempts: (item.attempts ?? 0) + 1 })
            .eq('id', item.id);
          const transfer = await this.client.transfers.create(
            {
              amount: item.amount_cents,
              currency: 'usd',
              destination,
              transfer_group: `staff_payout_${payoutId}`,
              ...(payout.stripe_charge_id
                ? { source_transaction: payout.stripe_charge_id }
                : {}),
              description: `Staff pay: ${item.staff_shifts?.title ?? 'shift'}`,
              metadata: {
                staff_payout_id: payoutId,
                staff_payout_item_id: item.id,
                staff_shift_id: item.shift_id,
              },
            },
            {
              idempotencyKey: `staff-item-${item.id}-${(item.attempts ?? 0) + 1}`,
            },
          );
          transferId = transfer.id;
        }
        await this.admin
          .from('staff_payout_items')
          .update({
            status: 'transferred',
            stripe_transfer_id: transferId,
            error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        await this.admin
          .from('staff_shifts')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', item.shift_id)
          .eq('status', 'approved');
        await this.sms.sendOne(
          item.staff_members?.phone,
          `Eventecos Pay\nYou were paid ${money(item.amount_cents)} for ${item.staff_shifts?.title ?? 'your shift'}. It reaches your bank on Stripe's normal payout schedule.`,
        );
      } catch (err) {
        const message = (err as Error).message ?? 'Transfer failed';
        this.logger.error(
          `Transfer for payout item ${item.id} failed: ${message}`,
        );
        await this.admin
          .from('staff_payout_items')
          .update({
            status: 'failed',
            error: message.slice(0, 300),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
    }

    const { data: remaining } = await this.admin
      .from('staff_payout_items')
      .select('id')
      .eq('payout_id', payoutId)
      .neq('status', 'transferred');
    await this.admin
      .from('staff_payouts')
      .update({
        status:
          (remaining ?? []).length === 0 ? 'completed' : 'needs_attention',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId);
  }
}
