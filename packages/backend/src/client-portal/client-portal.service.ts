import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from '../stripe/stripe.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

/** Returns all likely phone formats for a given phone string so we can query any format stored in the DB. */
function buildPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const variants = new Set<string>([
    phone,          // raw as-is (e.g. +15555555555)
    last10,         // 10-digit (5555555555)
    `1${last10}`,   // 11-digit no plus (15555555555)
    `+1${last10}`,  // E.164 (already in phone if US, but add explicitly)
  ]);
  return [...variants].filter(Boolean);
}

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly stripeService: StripeService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {}

  /** Helper: returns intake form IDs linked to any of the client's phone variants */
  private async getIntakeFormIds(supabase: any, phoneVariants: string[]): Promise<string[]> {
    const results = await Promise.all(
      phoneVariants.map(p =>
        supabase.from('intake_forms').select('id').eq('contact_phone', p),
      ),
    );
    return [...new Set(results.flatMap((r: any) => (r.data || []).map((i: any) => i.id)))];
  }

  /** Overview stats for the client dashboard */
  async getOverview(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // ── Bookings (by user_id + all phone variants) ────────────────────────────
    const bookingSelect = 'id, status, total_amount, deposit_amount, payment_status, created_at, event:event(id, name, date, start_time, end_time, venue, status)';
    const [byUserId, ...byPhones] = await Promise.all([
      supabase.from('booking').select(bookingSelect).eq('user_id', clientId).order('created_at', { ascending: false }),
      ...phoneVariants.map(p =>
        supabase.from('booking').select(bookingSelect).eq('contact_phone', p).order('created_at', { ascending: false }),
      ),
    ]);

    const seen = new Set<string>();
    const bookings: any[] = [];
    for (const row of [(byUserId.data || []), ...byPhones.map((r: any) => r.data || [])].flat()) {
      if (!seen.has(row.id)) { seen.add(row.id); bookings.push(row); }
    }

    // ── Linked intake form IDs (used for contracts + estimates) ───────────────
    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);
    const bookingIds = bookings.map((b: any) => b.id);

    // ── Contracts: by client_id OR intake_form_id ─────────────────────────────
    const contractQueries: any[] = [
      supabase.from('contracts').select('id, status, created_at').eq('client_id', clientId),
    ];
    if (intakeFormIds.length) {
      contractQueries.push(
        supabase.from('contracts').select('id, status, created_at').in('intake_form_id', intakeFormIds),
      );
    }

    // ── Estimates: by client_phone (direct), booking_id, or intake_form_id ──
    const estimateQueries: any[] = [
      // Direct phone match (most reliable)
      ...phoneVariants.map(p =>
        supabase.from('estimates').select('id, status, total_amount, created_at').eq('client_phone', p).neq('status', 'draft'),
      ),
    ];
    if (bookingIds.length) {
      estimateQueries.push(
        supabase.from('estimates').select('id, status, total_amount, created_at').in('booking_id', bookingIds).neq('status', 'draft'),
      );
    }
    if (intakeFormIds.length) {
      estimateQueries.push(
        supabase.from('estimates').select('id, status, total_amount, created_at').in('intake_form_id', intakeFormIds).neq('status', 'draft'),
      );
    }

    const [contractResults, estimateResults] = await Promise.all([
      Promise.all(contractQueries),
      Promise.all(estimateQueries),
    ]);

    const contractSeen = new Set<string>();
    const contracts = contractResults
      .flatMap((r: any) => r.data || [])
      .filter((c: any) => { if (contractSeen.has(c.id)) return false; contractSeen.add(c.id); return true; });

    const estimateSeen = new Set<string>();
    const estimates = estimateResults
      .flatMap((r: any) => r.data || [])
      .filter((e: any) => { if (estimateSeen.has(e.id)) return false; estimateSeen.add(e.id); return true; });

    // ── Invoices: by client_phone, booking_id, or intake_form_id ─────────────
    const invoiceSelect = 'id, invoice_number, status, total_amount, amount_due, amount_paid, due_date, issue_date, created_at, client_name';
    const invoiceQueries: any[] = [
      ...phoneVariants.map(p =>
        supabase.from('invoices').select(invoiceSelect).eq('client_phone', p).neq('status', 'draft').order('created_at', { ascending: false }),
      ),
    ];
    if (bookingIds.length) {
      invoiceQueries.push(
        supabase.from('invoices').select(invoiceSelect).in('booking_id', bookingIds).neq('status', 'draft').order('created_at', { ascending: false }),
      );
    }
    if (intakeFormIds.length) {
      invoiceQueries.push(
        supabase.from('invoices').select(invoiceSelect).in('intake_form_id', intakeFormIds).neq('status', 'draft').order('created_at', { ascending: false }),
      );
    }

    const invoiceResults = await Promise.all(invoiceQueries);
    const invoiceSeen = new Set<string>();
    const invoices = invoiceResults
      .flatMap((r: any) => r.data || [])
      .filter((i: any) => { if (invoiceSeen.has(i.id)) return false; invoiceSeen.add(i.id); return true; });

    return { bookings, contracts, estimates, invoices };
  }

  /** All bookings for the client including event + vendor info */
  async getBookings(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    const phoneVariants = buildPhoneVariants(clientPhone);
    const bookingSelect = `
      *,
      event:event(
        id, name, description, date, start_time, end_time, venue, location, max_guests, status, event_type
      )
    `;

    // Run separate queries to avoid PostgREST OR-filter encoding issues with '+' in phone
    const [byUserId, ...byPhones] = await Promise.all([
      supabase.from('booking').select(bookingSelect).eq('user_id', clientId).order('created_at', { ascending: false }),
      ...phoneVariants.map(p => supabase.from('booking').select(bookingSelect).eq('contact_phone', p).order('created_at', { ascending: false })),
    ]);

    const seen = new Set<string>();
    const merged: any[] = [];
    for (const row of [
      ...(byUserId.data || []),
      ...byPhones.flatMap(r => r.data || []),
    ]) {
      if (!seen.has(row.id)) { seen.add(row.id); merged.push(row); }
    }
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /** All events linked to this client — via intake forms (primary) or bookings (fallback) */
  async getEvents(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // 1. Find intake form IDs linked to this client's phone
    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);

    // 2. Find event IDs from intake forms directly (events auto-created when form was saved)
    let intakeEventIds: string[] = [];
    if (intakeFormIds.length) {
      const { data: intakeEvents } = await supabase
        .from('event')
        .select('id')
        .in('intake_form_id', intakeFormIds)
        .not('status', 'eq', 'cancelled');
      intakeEventIds = (intakeEvents || []).map((e: any) => e.id);
    }

    // 3. Also find event IDs from bookings (backward compat for events without an intake form link)
    const [byUserId, ...byPhones] = await Promise.all([
      supabase.from('booking').select('event_id').eq('user_id', clientId).not('status', 'eq', 'cancelled'),
      ...phoneVariants.map(p =>
        supabase.from('booking').select('event_id').eq('contact_phone', p).not('status', 'eq', 'cancelled'),
      ),
    ]);
    const bookingEventIds = [
      ...(byUserId.data || []),
      ...byPhones.flatMap((r: any) => r.data || []),
    ].map((b: any) => b.event_id).filter(Boolean);

    // 4. Merge all event IDs, deduplicate
    const allEventIds = [...new Set([...intakeEventIds, ...bookingEventIds])];
    if (!allEventIds.length) return [];

    // 5. Fetch full event rows
    const { data: events, error: eErr } = await supabase
      .from('event')
      .select('*')
      .in('id', allEventIds)
      .order('date', { ascending: true });

    if (eErr) {
      this.logger.error('getEvents error', eErr);
      return [];
    }
    if (!events?.length) return [];

    // 6. Fetch bookings for these events and embed the first non-cancelled one on each event
    const { data: bookings } = await supabase
      .from('booking')
      .select('id, event_id, status, client_confirmation_status, total_amount, deposit_amount, payment_status, notes, client_status')
      .in('event_id', allEventIds)
      .not('status', 'eq', 'cancelled');

    const bookingByEventId: Record<string, any> = {};
    for (const b of bookings || []) {
      if (!bookingByEventId[b.event_id]) bookingByEventId[b.event_id] = b;
    }

    // 7. Fetch owner info separately so a missing FK never breaks event display
    const ownerIds = [...new Set(events.map((e: any) => e.owner_id).filter(Boolean))];
    let ownersById: Record<string, any> = {};
    if (ownerIds.length) {
      const { data: owners } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone_number, email')
        .in('id', ownerIds);
      for (const o of owners || []) ownersById[o.id] = o;
    }

    return events.map((e: any) => ({
      ...e,
      owner: ownersById[e.owner_id] || null,
      booking: bookingByEventId[e.id] || null,
    }));
  }

  /** Vendors booked for this client's events, plus any vendors the client booked directly */
  async getVendors(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Get event IDs from all bookings associated with this client (by user_id OR phone)
    const { data: bookings } = await supabase
      .from('booking')
      .select('event_id')
      .or(`user_id.eq.${clientId},contact_phone.eq.${clientPhone}`);

    const eventIds = [...new Set((bookings || []).map((b: any) => b.event_id).filter(Boolean))];

    const vendorSelect = `
      *,
      vendor:vendor_accounts(
        id, business_name, category, city, state, phone, email, website, instagram,
        bio, hourly_rate, flat_rate, rate_description, is_verified, profile_image_url
      )
    `;

    // Run three queries in parallel: event-linked vendors, direct by user_id, direct by phone
    const [eventVendorsRes, directVendorsRes, phoneVendorsRes] = await Promise.all([
      eventIds.length
        ? supabase
            .from('vendor_bookings')
            .select(vendorSelect)
            .in('event_id', eventIds)
            .in('status', ['confirmed', 'pending', 'completed'])
            .order('created_at', { ascending: false })
        : { data: [] as any[], error: null },
      supabase
        .from('vendor_bookings')
        .select(vendorSelect)
        .eq('client_user_id', clientId)
        .order('created_at', { ascending: false }),
      clientPhone
        ? supabase
            .from('vendor_bookings')
            .select(vendorSelect)
            .eq('client_phone', clientPhone)
            .order('created_at', { ascending: false })
        : { data: [] as any[], error: null },
    ]);

    if (eventVendorsRes.error) {
      this.logger.error('getVendors (event) error', eventVendorsRes.error);
    }
    if (directVendorsRes.error) {
      this.logger.error('getVendors (direct) error', directVendorsRes.error);
    }

    // Merge and deduplicate by id
    const combined = [
      ...(eventVendorsRes.data || []),
      ...(directVendorsRes.data || []),
      ...(phoneVendorsRes.data || []),
    ];
    const seen = new Set<string>();
    return combined.filter((b: any) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }

  /** Leave a review for a vendor from the client portal */
  async leaveVendorReview(
    clientId: string,
    reviewerName: string,
    vendorAccountId: string,
    rating: number,
    reviewText?: string,
  ) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: vendor } = await supabase
      .from('vendor_accounts')
      .select('id')
      .eq('id', vendorAccountId)
      .single();

    if (!vendor) throw new NotFoundException('Vendor not found');

    const { data, error } = await supabase
      .from('vendor_reviews')
      .insert({
        vendor_account_id: vendorAccountId,
        reviewer_user_id: clientId,
        reviewer_name: reviewerName,
        rating,
        review_text: reviewText || null,
        is_public: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** Book a vendor directly from the client portal */
  async bookVendor(
    clientId: string,
    clientPhone: string,
    clientName: string,
    dto: {
      vendorAccountId: string;
      eventName: string;
      eventDate: string;
      startTime?: string;
      endTime?: string;
      venueName?: string;
      venueAddress?: string;
      notes?: string;
    },
  ) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: vendor } = await supabase
      .from('vendor_accounts')
      .select('id, business_name')
      .eq('id', dto.vendorAccountId)
      .eq('is_active', true)
      .single();

    if (!vendor) throw new NotFoundException('Vendor not found');

    const { data, error } = await supabase
      .from('vendor_bookings')
      .insert({
        vendor_account_id: dto.vendorAccountId,
        client_user_id: clientId,
        client_name: clientName,
        client_phone: clientPhone,
        booked_by_user_id: clientId,
        event_name: dto.eventName,
        event_date: dto.eventDate,
        start_time: dto.startTime ?? null,
        end_time: dto.endTime ?? null,
        venue_name: dto.venueName ?? null,
        venue_address: dto.venueAddress ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Client ${clientId} booked vendor ${dto.vendorAccountId}`);
    return data;
  }

  /** Browse all active vendors (public directory, accessible within client portal) */
  async browseVendors(category?: string) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('vendor_accounts')
      .select(
        'id, business_name, category, city, state, bio, profile_image_url, hourly_rate, flat_rate, rate_description, is_verified, phone, email, website, instagram',
      )
      .eq('is_active', true)
      .order('business_name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error('browseVendors error', error);
      return [];
    }
    return data || [];
  }

  /** Contracts for this client (by client_id, client_phone, or intake_form linked to their phone) */
  async getContracts(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);
    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);

    // Note: contracts table has no event_id FK — do not attempt an event join here
    const contractSelect = `*`;
    const queries: any[] = [
      supabase.from('contracts').select(contractSelect).eq('client_id', clientId).order('created_at', { ascending: false }),
      // Direct phone match (populated when contract is created from intake form)
      ...phoneVariants.map(p =>
        supabase.from('contracts').select(contractSelect).eq('client_phone', p).order('created_at', { ascending: false }),
      ),
    ];
    if (intakeFormIds.length) {
      queries.push(
        supabase.from('contracts').select(contractSelect).in('intake_form_id', intakeFormIds).order('created_at', { ascending: false }),
      );
    }

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    return results
      .flatMap((r: any) => {
        if (r.error) this.logger.error('getContracts error', r.error);
        return r.data || [];
      })
      .filter((c: any) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /** Fetch a single contract verifying it belongs to this client */
  async getContractById(contractId: string, clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (error || !data) throw new NotFoundException('Contract not found');

    // Verify this client owns the contract
    const phoneVariants = buildPhoneVariants(clientPhone);
    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);
    const isOwner =
      data.client_id === clientId ||
      phoneVariants.includes(data.client_phone ?? '') ||
      (data.intake_form_id && intakeFormIds.includes(data.intake_form_id));
    if (!isOwner) throw new NotFoundException('Contract not found');

    return data;
  }

  /** Client signs a contract */
  async signClientContract(
    contractId: string,
    clientId: string,
    clientPhone: string,
    signatureData: string,
    signerName: string,
    ipAddress?: string,
  ) {
    const contract = await this.getContractById(contractId, clientId, clientPhone);
    if (contract.status !== 'sent') {
      throw new BadRequestException('Contract must be in "sent" status to sign');
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('contracts')
      .update({
        signature_data: signatureData,
        signer_name: signerName.trim(),
        signer_ip_address: ipAddress ?? null,
        signed_date: new Date().toISOString(),
        status: 'signed',
      })
      .eq('id', contractId)
      .select()
      .single();
    if (error) throw error;

    // Notify owner + confirm to client via SMS
    try {
      const contractNumber: string = data.contract_number ?? contractId;
      if (data.owner_id) {
        const { data: ownerUser } = await supabase
          .from('users').select('phone_number').eq('id', data.owner_id).single();
        await this.smsNotifications.contractSigned((ownerUser as any)?.phone_number ?? null, signerName, contractNumber);
      }
      await this.smsNotifications.contractSignedConfirmToClient(
        data.client_phone ?? data.contact_phone ?? null,
        signerName,
        contractNumber,
      );
    } catch {
      // SMS errors never break signing
    }

    return data;
  }

  /** Estimates for this client (by client_id, booking phone, or intake_form phone) */
  async getEstimates(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // Get booking IDs and intake form IDs for this client
    const [bookingByUserId, ...bookingByPhones] = await Promise.all([
      supabase.from('booking').select('id').eq('user_id', clientId),
      ...phoneVariants.map(p => supabase.from('booking').select('id').eq('contact_phone', p)),
    ]);
    const bookingIds = [...new Set(
      [...(bookingByUserId.data || []), ...bookingByPhones.flatMap((r: any) => r.data || [])].map((b: any) => b.id),
    )];

    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);

    const estimateSelect = `*, items:estimate_items(*), booking:booking(id, contact_name, event_id)`;
    const queries: any[] = [
      // Direct client_phone match (most reliable — populated when estimate is created/sent)
      ...phoneVariants.map(p =>
        supabase.from('estimates').select(estimateSelect).eq('client_phone', p).neq('status', 'draft').order('created_at', { ascending: false }),
      ),
    ];
    if (bookingIds.length) {
      queries.push(
        supabase.from('estimates').select(estimateSelect).in('booking_id', bookingIds).neq('status', 'draft').order('created_at', { ascending: false }),
      );
    }
    if (intakeFormIds.length) {
      queries.push(
        supabase.from('estimates').select(estimateSelect).in('intake_form_id', intakeFormIds).neq('status', 'draft').order('created_at', { ascending: false }),
      );
    }

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    return results
      .flatMap((r: any) => {
        if (r.error) this.logger.error('getEstimates error', r.error);
        return r.data || [];
      })
      .filter((e: any) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /** Single estimate — verifies the client has access */
  async getEstimateById(estimateId: string, clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('estimates')
      .select('*, items:estimate_items(*)')
      .eq('id', estimateId)
      .single();
    if (error || !data) throw new NotFoundException('Estimate not found');

    const phoneVariants = buildPhoneVariants(clientPhone);
    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);
    const bookingResult = await supabase.from('booking').select('id').eq('user_id', clientId);
    const bookingIds = (bookingResult.data || []).map((b: any) => b.id);

    const hasAccess =
      phoneVariants.includes(data.client_phone ?? '') ||
      (data.booking_id && bookingIds.includes(data.booking_id)) ||
      (data.intake_form_id && intakeFormIds.includes(data.intake_form_id));
    if (!hasAccess) throw new NotFoundException('Estimate not found');
    return data;
  }

  /** Mark a contract or estimate as viewed (first open only — does not overwrite existing viewed_at) */
  async markViewed(table: 'contracts' | 'estimates', id: string) {
    const supabase = this.supabaseService.getAdminClient();
    await supabase
      .from(table)
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', id)
      .is('viewed_at', null);
  }

  /** Client approves or rejects a sent estimate */
  async respondToEstimate(
    estimateId: string,
    clientId: string,
    clientPhone: string,
    action: 'approved' | 'rejected',
  ) {
    const estimate = await this.getEstimateById(estimateId, clientId, clientPhone);

    if (estimate.status !== 'sent') {
      throw new BadRequestException('Only estimates in "sent" status can be responded to');
    }

    const supabase = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const updateData: any = { status: action };
    if (action === 'approved') updateData.approved_date = today;
    if (action === 'rejected') updateData.rejected_date = today;

    const { data, error } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', estimateId)
      .select()
      .single();
    if (error) throw error;

    // Notify the owner via SMS when a client approves
    try {
      if (action === 'approved' && data.owner_id) {
        const { data: ownerUser } = await supabase
          .from('users')
          .select('phone_number')
          .eq('id', data.owner_id)
          .single();
        const clientName = [
          (estimate as any).booking?.contact_name,
        ].filter(Boolean)[0] ?? 'A client';
        await this.smsNotifications.estimateApproved(
          (ownerUser as any)?.phone_number ?? null,
          clientName,
          data.estimate_number,
        );
      }
    } catch {
      // SMS errors never break the status update
    }

    return data;
  }

  /** Invoices for this client (by client_phone, booking_id, or intake_form_id) */
  async getInvoices(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // Get booking IDs and intake form IDs for cross-reference
    const [bookingByUserId, ...bookingByPhones] = await Promise.all([
      supabase.from('booking').select('id').eq('user_id', clientId),
      ...phoneVariants.map(p => supabase.from('booking').select('id').eq('contact_phone', p)),
    ]);
    const bookingIds = [...new Set(
      [...(bookingByUserId.data || []), ...bookingByPhones.flatMap((r: any) => r.data || [])].map((b: any) => b.id),
    )];
    const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);

    const invoiceSelect = `
      id, invoice_number, status, total_amount, amount_due, amount_paid,
      due_date, issue_date, paid_date, created_at, client_name, notes, owner_id,
      items:invoice_items(id, description, quantity, unit_price, amount, item_type)
    `;

    const queries: any[] = [
      ...phoneVariants.map(p =>
        supabase.from('invoices').select(invoiceSelect).eq('client_phone', p).neq('status', 'draft').order('created_at', { ascending: false }),
      ),
    ];
    if (bookingIds.length) {
      queries.push(
        supabase.from('invoices').select(invoiceSelect).in('booking_id', bookingIds).neq('status', 'draft').order('created_at', { ascending: false }),
      );
    }
    if (intakeFormIds.length) {
      queries.push(
        supabase.from('invoices').select(invoiceSelect).in('intake_form_id', intakeFormIds).neq('status', 'draft').order('created_at', { ascending: false }),
      );
    }

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    const invoices = results
      .flatMap((r: any) => {
        if (r.error) this.logger.error('getInvoices error', r.error);
        return r.data || [];
      })
      .filter((i: any) => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Enrich with owner/venue name so the client sees who the invoice is from
    const ownerIds = [...new Set(invoices.map((i: any) => i.owner_id).filter(Boolean))];
    let fromNameById: Record<string, string> = {};
    if (ownerIds.length) {
      const { data: ownerAccounts } = await supabase
        .from('owner_accounts')
        .select('primary_owner_id, business_name')
        .in('primary_owner_id', ownerIds);
      for (const oa of ownerAccounts || []) {
        if (oa.primary_owner_id && oa.business_name) {
          fromNameById[oa.primary_owner_id] = oa.business_name;
        }
      }
    }

    return invoices.map((i: any) => ({
      ...i,
      from_name: i.owner_id ? (fromNameById[i.owner_id] ?? null) : null,
    }));
  }

  /** Create a Stripe Checkout session for the client to pay an invoice */
  async createInvoiceCheckout(
    invoiceId: string,
    clientId: string,
    clientPhone: string,
    clientName: string,
  ): Promise<{ url: string }> {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // Verify the invoice belongs to this client before creating a checkout
    const invoiceSelect = 'id, client_phone, amount_due, status, booking_id, intake_form_id';
    const queries: any[] = phoneVariants.map(p =>
      supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).eq('client_phone', p).maybeSingle(),
    );

    let invoice: any = null;
    for (const q of await Promise.all(queries)) {
      if (q.data) { invoice = q.data; break; }
    }

    // If not found by phone, check via booking IDs (for bookings tied to this client)
    if (!invoice) {
      const [byUserId, ...byPhones] = await Promise.all([
        supabase.from('booking').select('id').eq('user_id', clientId),
        ...phoneVariants.map(p => supabase.from('booking').select('id').eq('contact_phone', p)),
      ]);
      const bookingIds = [...new Set(
        [...(byUserId.data || []), ...byPhones.flatMap((r: any) => r.data || [])].map((b: any) => b.id),
      )];
      if (bookingIds.length) {
        const { data } = await supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).in('booking_id', bookingIds).maybeSingle();
        invoice = data ?? null;
      }
    }

    // If still not found, check via intake_form_id (invoices linked to intake forms before booking conversion)
    if (!invoice) {
      const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);
      if (intakeFormIds.length) {
        const { data } = await supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).in('intake_form_id', intakeFormIds).maybeSingle();
        invoice = data ?? null;
      }
    }

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice is already paid');
    if (Number(invoice.amount_due) <= 0) throw new BadRequestException('Invoice has no outstanding balance');

    const url = await this.stripeService.createInvoiceCheckoutSession(invoiceId, clientName);
    return { url };
  }

  /** Messages between this client and their owner/vendors */
  async getMessages(clientId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`recipient_id.eq.${clientId},sender_id.eq.${clientId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      this.logger.error('getMessages error', error);
      return [];
    }
    return data || [];
  }

  /** Send a message from the client to the owner or a vendor */
  async sendMessage(
    clientId: string,
    clientPhone: string,
    recipientId: string,
    content: string,
    eventId?: string,
  ) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify the recipient is actually an owner/vendor that this client is booked with
    const phoneVariants = buildPhoneVariants(clientPhone);
    const [byUserId, ...byPhones] = await Promise.all([
      supabase
        .from('booking')
        .select('event_id, event:event(owner_id)')
        .eq('user_id', clientId),
      ...phoneVariants.map(p =>
        supabase
          .from('booking')
          .select('event_id, event:event(owner_id)')
          .eq('contact_phone', p),
      ),
    ]);

    const allMsgBookings = [
      ...(byUserId.data || []),
      ...byPhones.flatMap(r => r.data || []),
    ];

    const ownerIds = allMsgBookings.map((b: any) => b.event?.owner_id).filter(Boolean);

    // Also collect vendor IDs for their events
    const eventIds = allMsgBookings.map((b: any) => b.event_id).filter(Boolean);
    const { data: vendorBookings } = await supabase
      .from('vendor_bookings')
      .select('vendor_user_id')
      .in('event_id', eventIds)
      .eq('status', 'confirmed');

    const vendorUserIds = (vendorBookings || []).map((v: any) => v.vendor_user_id).filter(Boolean);

    const allowedRecipients = [...new Set([...ownerIds, ...vendorUserIds])];

    if (!allowedRecipients.includes(recipientId)) {
      throw new Error('You can only message the owner or vendors you are booked with.');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: clientId,
        recipient_id: recipientId,
        content,
        event_id: eventId || null,
        message_type: 'client_message',
        status: 'sent',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      this.logger.error('sendMessage error', error);
      throw new Error('Failed to send message.');
    }
    return data;
  }

  /** Notifications for this client — combines stored DB rows with dynamically generated alerts */
  async getNotifications(clientId: string, clientPhone?: string) {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Fetch stored notifications from DB
    const { data: stored, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error('getNotifications error', error);
    }

    const storedNotifs: any[] = stored || [];

    // 2. Generate dynamic notifications from live data (upcoming events, due invoices, new estimates)
    const dynamic: any[] = [];
    if (clientPhone) {
      try {
        const phoneVariants = buildPhoneVariants(clientPhone);
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Get booking IDs and intake form IDs
        const [bookingByUser, ...bookingByPhones] = await Promise.all([
          supabase.from('booking').select('id, event_id').eq('user_id', clientId).not('status', 'eq', 'cancelled'),
          ...phoneVariants.map(p => supabase.from('booking').select('id, event_id').eq('contact_phone', p).not('status', 'eq', 'cancelled')),
        ]);
        const allBookings = [...(bookingByUser.data || []), ...bookingByPhones.flatMap((r: any) => r.data || [])];
        const bookingIds = [...new Set(allBookings.map((b: any) => b.id))];
        const eventIds = [...new Set(allBookings.map((b: any) => b.event_id).filter(Boolean))];
        const intakeFormIds = await this.getIntakeFormIds(supabase, phoneVariants);

        // ── Upcoming event notifications ──────────────────────────────────────
        if (eventIds.length) {
          const { data: upcomingEvents } = await supabase
            .from('event')
            .select('id, name, date, start_time')
            .in('id', eventIds)
            .gte('date', now.toISOString().split('T')[0])
            .lte('date', sevenDays.toISOString().split('T')[0])
            .order('date', { ascending: true });

          for (const ev of upcomingEvents || []) {
            const daysUntil = Math.ceil((new Date(ev.date + 'T12:00:00').getTime() - now.getTime()) / 86_400_000);
            const dayLabel = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
            dynamic.push({
              id: `dynamic-event-${ev.id}`,
              user_id: clientId,
              type: 'booking',
              title: daysUntil === 0 ? `Your event is TODAY!` : `Upcoming event ${dayLabel}`,
              message: `${ev.name} is scheduled for ${new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${ev.start_time ? ` at ${ev.start_time}` : ''}.`,
              read: false,
              created_at: new Date().toISOString(),
              is_dynamic: true,
            });
          }
        }

        // ── Invoice due / overdue notifications ───────────────────────────────
        const invoiceSelect = 'id, invoice_number, status, amount_due, due_date';
        const invoiceQueries: any[] = [
          ...phoneVariants.map(p =>
            supabase.from('invoices').select(invoiceSelect).eq('client_phone', p).not('status', 'in', '("draft","paid","cancelled")'),
          ),
        ];
        if (bookingIds.length) {
          invoiceQueries.push(supabase.from('invoices').select(invoiceSelect).in('booking_id', bookingIds).not('status', 'in', '("draft","paid","cancelled")'));
        }
        if (intakeFormIds.length) {
          invoiceQueries.push(supabase.from('invoices').select(invoiceSelect).in('intake_form_id', intakeFormIds).not('status', 'in', '("draft","paid","cancelled")'));
        }
        const invoiceResults = await Promise.all(invoiceQueries);
        const invoiceSeen = new Set<string>();
        const unpaidInvoices = invoiceResults
          .flatMap((r: any) => r.data || [])
          .filter((i: any) => { if (invoiceSeen.has(i.id)) return false; invoiceSeen.add(i.id); return true; });

        for (const inv of unpaidInvoices) {
          if (!inv.due_date) continue;
          const dueDate = new Date(inv.due_date + 'T23:59:59');
          const isOverdue = dueDate < now;
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
          const isDueSoon = !isOverdue && daysUntilDue <= 7;
          if (isOverdue) {
            dynamic.push({
              id: `dynamic-invoice-overdue-${inv.id}`,
              user_id: clientId,
              type: 'alert',
              title: `Invoice #${inv.invoice_number} is OVERDUE`,
              message: `Your invoice of $${Number(inv.amount_due).toFixed(2)} was due on ${new Date(inv.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please pay as soon as possible.`,
              read: false,
              created_at: new Date().toISOString(),
              is_dynamic: true,
            });
          } else if (isDueSoon) {
            dynamic.push({
              id: `dynamic-invoice-due-${inv.id}`,
              user_id: clientId,
              type: 'alert',
              title: `Invoice #${inv.invoice_number} due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
              message: `Payment of $${Number(inv.amount_due).toFixed(2)} is due on ${new Date(inv.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
              read: false,
              created_at: new Date().toISOString(),
              is_dynamic: true,
            });
          }
        }

        // ── New estimate notifications (sent in last 30 days, not yet viewed) ─
        const estimateQueries: any[] = [
          ...phoneVariants.map(p =>
            supabase.from('estimates').select('id, status, total_amount, created_at, viewed_at').eq('client_phone', p).eq('status', 'sent').is('viewed_at', null),
          ),
        ];
        if (bookingIds.length) {
          estimateQueries.push(
            supabase.from('estimates').select('id, status, total_amount, created_at, viewed_at').in('booking_id', bookingIds).eq('status', 'sent').is('viewed_at', null),
          );
        }
        if (intakeFormIds.length) {
          estimateQueries.push(
            supabase.from('estimates').select('id, status, total_amount, created_at, viewed_at').in('intake_form_id', intakeFormIds).eq('status', 'sent').is('viewed_at', null),
          );
        }
        const estimateResults = await Promise.all(estimateQueries);
        const estimateSeen = new Set<string>();
        const newEstimates = estimateResults
          .flatMap((r: any) => r.data || [])
          .filter((e: any) => { if (estimateSeen.has(e.id)) return false; estimateSeen.add(e.id); return true; });

        for (const est of newEstimates) {
          dynamic.push({
            id: `dynamic-estimate-${est.id}`,
            user_id: clientId,
            type: 'estimate',
            title: 'New estimate received',
            message: `You have a new estimate for $${Number(est.total_amount).toFixed(2)} waiting for your review.`,
            read: false,
            created_at: est.created_at,
            is_dynamic: true,
          });
        }

        // ── New contract notifications (sent, not yet viewed) ─────────────────
        const contractQueries: any[] = [
          supabase.from('contracts').select('id, contract_number, status, created_at, viewed_at').eq('client_id', clientId).eq('status', 'sent').is('viewed_at', null),
          ...phoneVariants.map(p =>
            supabase.from('contracts').select('id, contract_number, status, created_at, viewed_at').eq('client_phone', p).eq('status', 'sent').is('viewed_at', null),
          ),
        ];
        if (intakeFormIds.length) {
          contractQueries.push(
            supabase.from('contracts').select('id, contract_number, status, created_at, viewed_at').in('intake_form_id', intakeFormIds).eq('status', 'sent').is('viewed_at', null),
          );
        }
        const contractResults = await Promise.all(contractQueries);
        const contractSeen = new Set<string>();
        const newContracts = contractResults
          .flatMap((r: any) => r.data || [])
          .filter((c: any) => { if (contractSeen.has(c.id)) return false; contractSeen.add(c.id); return true; });

        for (const con of newContracts) {
          dynamic.push({
            id: `dynamic-contract-${con.id}`,
            user_id: clientId,
            type: 'contract',
            title: 'Contract ready to sign',
            message: `A contract${con.contract_number ? ` #${con.contract_number}` : ''} has been sent to you and is ready for your e-signature.`,
            read: false,
            created_at: con.created_at,
            is_dynamic: true,
          });
        }
      } catch (dynErr) {
        this.logger.warn('[getNotifications] dynamic generation failed:', (dynErr as any)?.message);
      }
    }

    // Merge stored + dynamic; deduplicate by id; sort newest first
    const storedIds = new Set(storedNotifs.map((n: any) => n.id));
    const merged = [...storedNotifs, ...dynamic.filter(d => !storedIds.has(d.id))];
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /** Mark a notification as read */
  async markNotificationRead(clientId: string, notificationId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', clientId);

    if (error) {
      this.logger.error('markNotificationRead error', error);
    }
    return { success: !error };
  }

  /** Bookings pending client confirmation (linked via intake form phone match) */
  async getPendingConfirmations(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    const bookingSelect = `
      id, status, contact_name, contact_phone, client_confirmation_status,
      event:event(id, name, date, start_time, venue)
    `;

    // Query for explicit 'pending' confirmations AND null status (pre-migration bookings)
    // Run both in parallel across all phone variants
    const [pendingResults, nullResults] = await Promise.all([
      Promise.all(
        phoneVariants.map(p =>
          supabase
            .from('booking')
            .select(bookingSelect)
            .eq('contact_phone', p)
            .eq('client_confirmation_status', 'pending')
            .order('created_at', { ascending: false })
        )
      ),
      Promise.all(
        phoneVariants.map(p =>
          supabase
            .from('booking')
            .select(bookingSelect)
            .eq('contact_phone', p)
            .is('client_confirmation_status', null)
            .order('created_at', { ascending: false })
        )
      ),
    ]);

    const seen = new Set<string>();
    const merged: any[] = [];
    const allRows = [
      ...pendingResults.flatMap(r => r.data || []),
      ...nullResults.flatMap(r => r.data || []),
    ];
    for (const row of allRows) {
      if (!seen.has(row.id)) { seen.add(row.id); merged.push(row); }
    }
    return merged;
  }

  /** Client confirms or rejects a booking that was linked to them via phone */
  async respondToConfirmation(clientPhone: string, bookingId: string, action: 'confirmed' | 'rejected') {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // Find the booking by ID and verify it belongs to this client's phone
    const { data: booking, error: fetchErr } = await supabase
      .from('booking')
      .select('id, contact_phone, client_confirmation_status')
      .eq('id', bookingId)
      .eq('client_confirmation_status', 'pending')
      .maybeSingle();

    if (fetchErr || !booking) {
      throw new NotFoundException('Booking not found or already responded to.');
    }

    // Verify the booking's phone matches one of the client's phone variants
    if (!phoneVariants.includes(booking.contact_phone)) {
      throw new NotFoundException('Booking not found or already responded to.');
    }

    const { error } = await supabase
      .from('booking')
      .update({ client_confirmation_status: action })
      .eq('id', bookingId);

    if (error) throw new BadRequestException(error.message);
    return { success: true, action };
  }

  // ── Invite-based confirmation flow ────────────────────────────────────────

  /**
   * Public: look up intake form details by invite token for the landing page.
   * Returns only the event/contact fields needed to display the invite card.
   */
  async getIntakeFormByToken(token: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('intake_forms')
      .select('id, contact_name, contact_email, contact_phone, event_type, event_name, event_date, event_time, event_end_time, guest_count, venue_preference, special_requests, invite_status, invite_token')
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Invitation not found or has expired.');

    // Don't expose the raw phone number or email in the response (security)
    const { contact_phone, contact_email, ...publicFields } = data;
    return {
      ...publicFields,
      // Mask the phone so the client knows what to enter (last 4 digits only)
      phoneHint: contact_phone ? `***-***-${contact_phone.replace(/\D/g, '').slice(-4)}` : null,
    };
  }

  /**
   * Confirm an invite: verifies the logged-in client's phone matches the intake form,
   * then creates the event + booking with client_confirmation_status = 'confirmed'.
   * This is the ONLY way a client can confirm their event.
   */
  async confirmInvite(token: string, clientPhone: string, clientId: string) {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Load the intake form
    const { data: form, error: formErr } = await supabase
      .from('intake_forms')
      .select('*')
      .eq('invite_token', token)
      .maybeSingle();

    if (formErr || !form) throw new NotFoundException('Invitation not found.');

    if (form.invite_status === 'confirmed') {
      throw new BadRequestException('This event has already been confirmed.');
    }

    // 2. Verify the client's phone matches (using variants so format doesn't matter)
    const clientVariants = buildPhoneVariants(clientPhone);
    const formVariants = form.contact_phone ? buildPhoneVariants(form.contact_phone) : [];
    const phoneMatches = clientVariants.some(v => formVariants.includes(v));

    if (!phoneMatches) {
      throw new BadRequestException(
        'The phone number on your account does not match the one on this invitation.',
      );
    }

    // 3. Reuse the event already linked to this intake form (auto-created on form save).
    // Only create a new event if none exists, preventing duplicates.
    let event: any;
    const { data: existingEvent } = await supabase
      .from('event')
      .select('*')
      .eq('intake_form_id', form.id)
      .maybeSingle();

    if (existingEvent) {
      // Sync status and keep guest/venue data up to date
      const { data: updatedEvent } = await supabase
        .from('event')
        .update({
          status: 'scheduled',
          guest_count: form.guest_count || existingEvent.guest_count,
          venue: form.venue_preference || existingEvent.venue || 'TBD',
        })
        .eq('id', existingEvent.id)
        .select()
        .single();
      event = updatedEvent || existingEvent;
    } else {
      // No event exists yet — create one and link it to the intake form
      const eventData = {
        name: `${form.event_type || 'Event'} - ${form.contact_name}`,
        date: form.event_date,
        start_time: form.event_time || '00:00',
        end_time: '23:59',
        description: form.special_requests || '',
        status: 'scheduled' as const,
        guest_count: form.guest_count,
        venue: form.venue_preference || 'TBD',
        owner_id: form.user_id,
        intake_form_id: form.id,
      };

      const { data: createdEvent, error: eventErr } = await supabase
        .from('event')
        .insert([eventData])
        .select()
        .single();

      if (eventErr) throw new BadRequestException(`Failed to create event: ${eventErr.message}`);
      event = createdEvent;
    }

    // 4. Create the booking – mark confirmed immediately.
    // Guard against duplicate bookings if this event was already booked.
    const { data: existingBooking } = await supabase
      .from('booking')
      .select('id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (existingBooking) {
      // A booking already exists (e.g. owner already converted the lead).
      // Just mark it as confirmed and update the intake form status.
      await supabase
        .from('booking')
        .update({ client_confirmation_status: 'confirmed' })
        .eq('id', existingBooking.id);

      await supabase
        .from('intake_forms')
        .update({ invite_status: 'confirmed', status: 'confirmed' })
        .eq('id', form.id);

      this.logger.log(`Client ${clientPhone} confirmed invite ${token} → existing booking ${existingBooking.id}`);
      return { success: true, event, booking: existingBooking };
    }

    const normalizedPhone = clientPhone; // already normalized by auth service
    const bookingData = {
      user_id: form.user_id,
      event_id: event.id,
      booking_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: normalizedPhone,
      special_requests: form.special_requests,
      notes: 'Confirmed by client via invitation email.',
      client_confirmation_status: 'confirmed',
    };

    const { data: booking, error: bookingErr } = await supabase
      .from('booking')
      .insert([bookingData])
      .select()
      .single();

    if (bookingErr) {
      // Only delete the event if we just created it (not reused)
      if (!existingEvent) {
        await supabase.from('event').delete().eq('id', event.id);
      }
      throw new BadRequestException(`Failed to create booking: ${bookingErr.message}`);
    }

    // 5. Mark intake form as confirmed
    await supabase
      .from('intake_forms')
      .update({ invite_status: 'confirmed', status: 'confirmed' })
      .eq('id', form.id);

    // 6. Insert a notification so the client sees confirmation in their portal
    try {
      await supabase.from('notifications').insert({
        user_id: clientId,
        event_id: event.id,
        type: 'booking',
        message: `Your event "${event.name}" has been confirmed! Check the Events tab for details.`,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      this.logger.warn('[confirmInvite] notification insert failed:', notifErr);
    }

    this.logger.log(`Client ${clientPhone} confirmed invite ${token} → booking ${booking.id}`);
    return { success: true, event, booking };
  }

  /**
   * Decline an invite via the invite link (before confirming).
   */
  async declineInvite(token: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: form, error } = await supabase
      .from('intake_forms')
      .select('id, contact_phone, invite_status')
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !form) throw new NotFoundException('Invitation not found.');
    if (form.invite_status === 'confirmed') {
      throw new BadRequestException('This event has already been confirmed and cannot be declined.');
    }

    const clientVariants = buildPhoneVariants(clientPhone);
    const formVariants = form.contact_phone ? buildPhoneVariants(form.contact_phone) : [];
    if (!clientVariants.some(v => formVariants.includes(v))) {
      throw new BadRequestException('Phone number does not match this invitation.');
    }

    await supabase
      .from('intake_forms')
      .update({ invite_status: 'declined' })
      .eq('id', form.id);

    return { success: true, message: 'Invitation declined.' };
  }

  /** Items & packages the owner offers */
  async getItems(clientId: string, clientPhone: string) {
    const supabase = this.supabaseService.getAdminClient();
    const phoneVariants = buildPhoneVariants(clientPhone);

    // Get owner ID from bookings — try user_id first then each phone variant
    const [byUserId, ...byPhones] = await Promise.all([
      supabase.from('booking').select('event:event(owner_id)').eq('user_id', clientId).limit(1),
      ...phoneVariants.map(p => supabase.from('booking').select('event:event(owner_id)').eq('contact_phone', p).limit(1)),
    ]);

    const allResults = [(byUserId.data || []), ...byPhones.map(r => r.data || [])].flat();
    const ownerId = (allResults[0] as any)?.event?.owner_id;
    if (!ownerId) return [];

    const { data, error } = await supabase
      .from('service_items')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      this.logger.error('getItems error', error);
      return [];
    }
    return data || [];
  }
}
