import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly smsNotifications: SmsNotificationsService,
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  async findAll(supabase: SupabaseClient): Promise<any[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async findByOwner(supabase: SupabaseClient, ownerId: string, venueId?: string): Promise<any[]> {
    let query = supabase
      .from('contracts')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (venueId) {
      const admin = this.supabaseService.getAdminClient();
      const { data: venueEvents } = await admin.from('event').select('id, intake_form_id').eq('venue_id', venueId);
      if (!venueEvents || venueEvents.length === 0) return [];
      const eventIds = venueEvents.map((e: any) => e.id);
      const intakeIds = venueEvents.map((e: any) => e.intake_form_id).filter(Boolean);
      // Filter by event_id or intake_form_id
      if (intakeIds.length > 0) {
        query = query.in('intake_form_id', intakeIds);
      } else {
        query = query.in('event_id', eventIds);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async findByClient(supabase: SupabaseClient, clientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async findOne(supabase: SupabaseClient, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return null;

    // Enrich with owner name for the detail page (uses admin to bypass RLS)
    const admin = this.supabaseService.getAdminClient();
    if (data.owner_id) {
      const { data: ownerUser } = await admin
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', data.owner_id)
        .single();
      if (ownerUser) {
        data.owner_name = `${ownerUser.first_name ?? ''} ${ownerUser.last_name ?? ''}`.trim() || null;
        data.owner_email = ownerUser.email ?? null;
      }
    }
    return data;
  }

  async create(supabase: SupabaseClient, contractData: any): Promise<any> {
    const admin = this.supabaseService.getAdminClient();

    const { count } = await admin
      .from('contracts')
      .select('*', { count: 'exact', head: true });
    const contractNumber = `CON-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, '0')}`;

    // Auto-populate client contact info from the linked intake form so that
    // sendContract() can SMS the client without a separate lookup.
    let clientName: string | undefined = contractData.client_name;
    let clientPhone: string | undefined = contractData.client_phone;
    let clientEmail: string | undefined = contractData.client_email;

    // For vendor template contracts: populate contact info from vendor_accounts
    if (contractData.vendor_account_id && (!clientPhone || !clientName)) {
      const { data: vendorAccount } = await admin
        .from('vendor_accounts')
        .select('business_name, phone, email')
        .eq('id', contractData.vendor_account_id)
        .single();
      if (vendorAccount) {
        clientName  = clientName  ?? vendorAccount.business_name ?? undefined;
        clientPhone = clientPhone ?? vendorAccount.phone         ?? undefined;
        clientEmail = clientEmail ?? vendorAccount.email         ?? undefined;
      }
    } else if (contractData.intake_form_id && (!clientPhone || !clientName)) {
      const { data: form } = await admin
        .from('intake_forms')
        .select('contact_name, contact_phone, contact_email')
        .eq('id', contractData.intake_form_id)
        .single();
      if (form) {
        clientName  = clientName  ?? form.contact_name  ?? undefined;
        clientPhone = clientPhone ?? form.contact_phone ?? undefined;
        clientEmail = clientEmail ?? form.contact_email ?? undefined;
      }
    }

    const payload: any = {
      ...contractData,
      contract_number: contractNumber,
      status: contractData.status || 'draft',
    };
    if (clientName)  payload.client_name  = clientName;
    if (clientPhone) payload.client_phone = clientPhone;
    if (clientEmail) payload.client_email = clientEmail;

    const { data, error } = await admin
      .from('contracts')
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error('[ContractsService] insert error:', error.message, error.details, error.hint);
      throw new Error(error.message);
    }
    return data;
  }

  async update(supabase: SupabaseClient, id: string, contractData: any): Promise<any | null> {
    const { data, error } = await supabase
      .from('contracts')
      .update(contractData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  generateBody(contractType: string, td: any): string {
    const agreementDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (contractType === 'venue_booking') {
      const totalAmount = td.venueTotalAmount || '';
      const deposit = td.venueDeposit || '';
      const remaining = totalAmount && deposit
        ? (parseFloat(totalAmount) - parseFloat(deposit)).toFixed(2)
        : '__________';
      return `<div style="font-family:Georgia,serif;max-width:780px;margin:0 auto;color:#111;line-height:1.75;padding:16px;">
  <h1 style="text-align:center;font-size:1.35rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px;">Venue Listing &amp; Booking Agreement</h1>
  <p style="text-align:center;font-style:italic;color:#555;margin-top:-16px;margin-bottom:28px;">EventEcos Platform</p>
  <p>This Agreement is entered into as of <strong>${agreementDate}</strong>, by and between:</p>
  <p style="margin-left:16px;"><strong>Venue Owner / Operator:</strong> ${td.venueOwnerName || ''}<br/><strong>Venue Name:</strong> ${td.venueName || ''}</p>
  <p style="margin-left:16px;">and</p>
  <p style="margin-left:16px;"><strong>Client / Event Host:</strong> ${td.venueClientName || ''}</p>
  <hr style="border:none;border-top:1px solid #ccc;margin:28px 0;"/>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:0;">1. Platform Overview</h2>
  <p>This booking is facilitated through EventEcos ("Platform"), which provides listing, booking, and payment processing services.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">2. Event Booking Details</h2>
  <ul style="margin:0;padding-left:20px;">
    <li><strong>Event Type:</strong> ${td.venueEventType || '____________________________'}</li>
    <li><strong>Event Date:</strong> ${td.venueEventDate || '____________________________'}</li>
    <li><strong>Event Time:</strong> ${td.venueEventTime || '____________________________'}</li>
    <li><strong>Access Window:</strong> ${td.venueAccessWindow || '____________________________'}</li>
    <li><strong>Guest Count:</strong> ${td.venueGuestCount || '____________________________'}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">3. Fees &amp; Payment</h2>
  <ul style="margin:0;padding-left:20px;">
    <li><strong>Total Booking Amount:</strong> $${totalAmount || '__________'}</li>
    <li><strong>Deposit:</strong> $${deposit || '__________'}</li>
    <li><strong>Remaining Balance Due:</strong> $${remaining}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">4. Cancellation &amp; Refund Policy</h2>
  <ul style="margin:0;padding-left:20px;">
    <li>More than <strong>${td.venueCancelMoreThan || '____'} days</strong> prior: ${td.venueCancelMoreThanPolicy || ''}</li>
    <li>Within <strong>${td.venueCancelWithin || '____'} days</strong>: ${td.venueCancelWithinPolicy || ''}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">5. Venue Responsibilities</h2>
  <p>Venue Owner agrees to provide the venue as described in the listing, maintain safe and clean premises, and honor all confirmed bookings.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">6. Client Responsibilities</h2>
  <p>Client agrees to use the venue only as described and comply with all laws. Client is responsible for any damages during the event.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">7. Governing Law</h2>
  <p>This Agreement shall be governed by the laws of <strong>${td.venueGoverningState || 'Mississippi'}</strong>.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:32px;">Signatures</h2>
  <div style="margin-top:20px;display:flex;gap:48px;flex-wrap:wrap;">
    <div style="flex:1;min-width:220px;"><p style="margin:0 0 4px;font-weight:bold;">Client / Event Host</p><p style="margin:0;font-size:.9rem;color:#444;">${td.venueClientName || ''}</p><div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div><p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p></div>
    <div style="flex:1;min-width:220px;"><p style="margin:0 0 4px;font-weight:bold;">Venue Owner / Operator</p><p style="margin:0;font-size:.9rem;color:#444;">${td.venueOwnerName || ''} — ${td.venueName || ''}</p><div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div><p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p></div>
  </div>
</div>`;
    } else if (contractType === 'vendor_template') {
      const paymentSection = td.paymentTerms === 'full'
        ? `<li>Full payment of <strong>$${td.totalFee}</strong> due upfront prior to services.</li>`
        : `<li>Deposit: <strong>$${td.depositAmount || '___'}</strong> due on <strong>${td.depositDueDate || '___'}</strong></li>
           <li>Balance: <strong>$${(parseFloat(td.totalFee || '0') - parseFloat(td.depositAmount || '0')).toFixed(2)}</strong> due on <strong>${td.balanceDueDate || '___'}</strong></li>`;
      return `<div style="font-family:Georgia,serif;max-width:780px;margin:0 auto;color:#111;line-height:1.75;padding:16px;">
  <h1 style="text-align:center;font-size:1.35rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px;">Vendor Services Agreement</h1>
  <p>This Agreement is entered into as of <strong>${agreementDate}</strong>, by and between:</p>
  <p style="margin-left:16px;"><strong>Company:</strong> ${td.companyName || ''}, a ${td.companyState || ''} company ("Company")<br/>and<br/><strong>Vendor:</strong> ${td.vendorName || ''}, a ${td.vendorState || ''} ${td.vendorEntityType || 'LLC'} ("Vendor")</p>
  <hr style="border:none;border-top:1px solid #ccc;margin:28px 0;"/>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:0;">1. Scope of Services</h2>
  <p>Vendor agrees to provide: <em>${td.servicesDescription || ''}</em></p>
  <p>Location: <strong>${td.eventLocation || ''}</strong> | Dates: <strong>${td.eventDates || ''}</strong></p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">2. Compensation</h2>
  <ul style="margin:0;padding-left:20px;">
    <li>Total Fee: <strong>$${td.totalFee || ''}</strong></li>
    ${paymentSection}
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">3. Independent Contractor</h2>
  <p>Vendor is an independent contractor, not an employee or partner of Company.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">4. Cancellation Policy</h2>
  <ul style="margin:0;padding-left:20px;">
    <li>Vendor must provide <strong>${td.noticeDays || '7'} days</strong> written notice to cancel.</li>
    <li>Refund terms: ${td.cancelRefundTerms || ''}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">5. Term</h2>
  <p>Effective from <strong>${td.startDate || ''}</strong> through <strong>${td.endDate || 'completion of services'}</strong>.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">6. Governing Law</h2>
  <p>Governed by the laws of <strong>${td.governingState || 'Mississippi'}</strong>.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:32px;">Signatures</h2>
  <div style="margin-top:20px;display:flex;gap:48px;flex-wrap:wrap;">
    <div style="flex:1;min-width:220px;"><p style="margin:0 0 4px;font-weight:bold;">Company Representative</p><p style="margin:0;font-size:.9rem;color:#444;">${td.companyName || ''}</p><div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div><p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p></div>
    <div style="flex:1;min-width:220px;"><p style="margin:0 0 4px;font-weight:bold;">Vendor</p><p style="margin:0;font-size:.9rem;color:#444;">${td.vendorName || ''}</p><div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div><p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p></div>
  </div>
</div>`;
    }
    return '';
  }

  async signContract(
    supabase: SupabaseClient,
    id: string,
    signatureData: { signatureData: string; signerName: string; ipAddress?: string },
  ): Promise<any | null> {
    const { data, error } = await supabase
      .from('contracts')
      .update({
        signature_data: signatureData.signatureData,
        signer_name: signatureData.signerName,
        signer_ip_address: signatureData.ipAddress,
        signed_date: new Date().toISOString(),
        status: 'signed',
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Notify owner that client has signed, and confirm to client
    try {
      const contractNumber: string = data.contract_number ?? id;
      const signerName: string = signatureData.signerName || data.signer_name || 'Client';

      // Look up owner phone from users table
      if (data.owner_id) {
        const { data: ownerUser } = await supabase
          .from('users')
          .select('phone_number')
          .eq('id', data.owner_id)
          .single();
        const ownerPhone: string | null = (ownerUser as any)?.phone_number ?? null;
        await this.smsNotifications.contractSigned(ownerPhone, signerName, contractNumber);
      }

      // Also confirm to client (if they have a phone on the contract)
      const clientPhone: string | null =
        data.client_phone ?? data.contact_phone ?? null;
      await this.smsNotifications.contractSignedConfirmToClient(
        clientPhone,
        signerName,
        contractNumber,
      );
    } catch {
      // SMS errors must never break the signing flow
    }

    return data;
  }

  async sendContract(supabase: SupabaseClient, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('contracts')
      .update({
        sent_date: new Date().toISOString(),
        status: 'sent',
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Vendor template contracts link to the vendor dashboard, others to client portal
    const isVendorContract = data.contract_type === 'vendor_template';
    const contractUrl = isVendorContract
      ? `${frontendUrl}/vendors/dashboard/contracts/${id}`
      : `${frontendUrl}/client-portal/contracts/${id}`;

    // Notify client via SMS (includes direct signing link)
    try {
      const clientPhone: string | null =
        data.client_phone ?? data.contact_phone ?? null;
      const clientName: string = data.client_name ?? data.contact_name ?? 'Valued Client';
      const contractNumber: string = data.contract_number ?? id;
      await this.smsNotifications.contractSent(clientPhone, clientName, contractNumber, contractUrl);
    } catch {
      // SMS errors must never break the contract send
    }

    // Send contract email via Resend
    try {
      const clientEmail: string | null = data.client_email ?? data.contact_email ?? null;
      const clientName: string = data.client_name ?? data.contact_name ?? 'Valued Client';
      const contractNumber: string = data.contract_number ?? id;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // Vendor template contracts link to the vendor dashboard, others to client portal
      const isVendorContract = data.contract_type === 'vendor_template';
      const contractUrl = isVendorContract
        ? `${frontendUrl}/vendors/dashboard/contracts/${id}`
        : `${frontendUrl}/client-portal/contracts/${id}`;

      let ownerName = 'Your Event Coordinator';
      if (data.owner_id) {
        const admin = this.supabaseService.getAdminClient();
        const { data: ownerUser } = await admin
          .from('users')
          .select('first_name, last_name')
          .eq('id', data.owner_id)
          .maybeSingle();
        if (ownerUser) {
          ownerName =
            `${ownerUser.first_name ?? ''} ${ownerUser.last_name ?? ''}`.trim() || ownerName;
        }
      }

      if (clientEmail) {
        await this.mailService.sendContractWithResend({
          clientName,
          clientEmail,
          ownerName,
          contractNumber,
          contractTitle: data.title ?? 'Contract',
          contractDescription: data.description ?? undefined,
          contractUrl,
        });
      }
    } catch {
      // Email errors must never break the contract send
    }

    return data;
  }

  /** Owner counter-signs a contract after the client has signed. */
  async ownerSignContract(
    supabase: SupabaseClient,
    id: string,
    ownerSignatureData: string,
    ownerSignerName: string,
    ownerId: string,
  ): Promise<any> {
    const { data, error } = await supabase
      .from('contracts')
      .update({
        owner_signature_data: ownerSignatureData,
        owner_signer_name: ownerSignerName,
        owner_signed_date: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();
    if (error) throw error;

    // Notify client that owner has counter-signed
    try {
      const clientPhone: string | null = data.client_phone ?? data.contact_phone ?? null;
      const clientName: string = data.client_name ?? data.contact_name ?? 'Valued Client';
      const contractNumber: string = data.contract_number ?? id;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const contractUrl = `${frontendUrl}/client-portal/contracts/${id}`;
      await this.smsNotifications.trySend(
        clientPhone,
        `EventEcos: Hi ${clientName}, your contract ${contractNumber} has been counter-signed by your venue coordinator. View your fully executed contract: ${contractUrl}`,
      );
    } catch { /* SMS errors must not break signing */ }

    return data;
  }

  /** Fetch all contracts for a vendor (identified by their user_id). Uses admin client to bypass RLS. */
  async findByVendorUser(userId: string): Promise<any[]> {
    const admin = this.supabaseService.getAdminClient();
    // Look up vendor_account_id for this user
    const { data: vendorAccount } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (!vendorAccount) return [];

    const { data, error } = await admin
      .from('contracts')
      .select('*')
      .eq('vendor_account_id', vendorAccount.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /** Vendor signs a contract (verifies vendor ownership before updating). */
  async signContractAsVendor(
    userId: string,
    contractId: string,
    signatureData: string,
    signerName: string,
  ): Promise<any> {
    const admin = this.supabaseService.getAdminClient();
    // Verify this vendor owns the contract
    const { data: vendorAccount } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (!vendorAccount) throw new Error('Vendor account not found');

    const { data: contract } = await admin
      .from('contracts')
      .select('id, vendor_account_id, contract_number, owner_id')
      .eq('id', contractId)
      .single();
    if (!contract || contract.vendor_account_id !== vendorAccount.id) {
      throw new Error('Contract not found or not accessible');
    }

    const { data, error } = await admin
      .from('contracts')
      .update({
        signature_data: signatureData,
        signer_name: signerName,
        signed_date: new Date().toISOString(),
        status: 'signed',
      })
      .eq('id', contractId)
      .select()
      .single();
    if (error) throw error;

    // Notify owner
    try {
      const { data: ownerUser } = await admin
        .from('users')
        .select('phone_number')
        .eq('id', data.owner_id)
        .single();
      await this.smsNotifications.contractSigned(
        (ownerUser as any)?.phone_number ?? null,
        signerName,
        data.contract_number ?? contractId,
      );
    } catch { /* SMS errors must not break signing */ }

    return data;
  }

  /** Vendor sends a contract to the client or back to the owner for review. */
  async sendContractAsVendor(
    userId: string,
    contractId: string,
    sendTo: 'client' | 'owner',
  ): Promise<any> {
    const admin = this.supabaseService.getAdminClient();

    // Verify vendor owns this contract
    const { data: vendorAccount } = await admin
      .from('vendor_accounts')
      .select('id, business_name')
      .eq('user_id', userId)
      .single();
    if (!vendorAccount) throw new Error('Vendor account not found');

    const { data: contract } = await admin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();
    if (!contract || contract.vendor_account_id !== vendorAccount.id) {
      throw new Error('Contract not found or not accessible');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const contractNumber: string = contract.contract_number ?? contractId;

    if (sendTo === 'client') {
      let clientEmail: string | null = contract.client_email ?? contract.contact_email ?? null;
      let clientName: string = contract.client_name ?? contract.contact_name ?? 'Valued Client';

      if (!clientEmail && contract.intake_form_id) {
        const { data: form } = await admin
          .from('intake_forms')
          .select('contact_name, contact_email, contact_phone')
          .eq('id', contract.intake_form_id)
          .single();
        if (form) {
          clientEmail = form.contact_email ?? null;
          clientName = form.contact_name ?? clientName;
        }
      }

      if (clientEmail) {
        const contractUrl = `${frontendUrl}/client-portal/contracts/${contractId}`;
        await this.mailService.sendContractWithResend({
          clientName,
          clientEmail,
          ownerName: vendorAccount.business_name,
          contractNumber,
          contractTitle: contract.title ?? 'Contract',
          contractDescription: contract.description ?? undefined,
          contractUrl,
        }).catch(() => {});
      }

      // SMS notification to client
      try {
        const clientPhone: string | null = contract.client_phone ?? contract.contact_phone ?? null;
        await this.smsNotifications.contractSent(clientPhone, clientName, contractNumber);
      } catch { /* non-fatal */ }
    } else {
      // sendTo === 'owner'
      const { data: ownerUser } = await admin
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', contract.owner_id)
        .single();

      if (ownerUser?.email) {
        const ownerName =
          `${ownerUser.first_name ?? ''} ${ownerUser.last_name ?? ''}`.trim() || 'Owner';
        const contractUrl = `${frontendUrl}/dashboard/contracts/${contractId}`;
        await this.mailService.sendContractWithResend({
          clientName: ownerName,
          clientEmail: ownerUser.email,
          ownerName: vendorAccount.business_name,
          contractNumber,
          contractTitle: contract.title ?? 'Contract',
          contractDescription: contract.description ?? undefined,
          contractUrl,
        }).catch(() => {});
      }
    }

    // Mark as sent if still in draft
    const updates: any = {};
    if (contract.status === 'draft') {
      updates.status = 'sent';
      updates.sent_date = new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await admin
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return contract;
  }

  async voidContract(supabase: SupabaseClient, id: string, ownerId: string): Promise<any> {
    const admin = this.supabaseService.getAdminClient();

    // Verify the contract belongs to this owner
    const { data: contract, error: fetchError } = await admin
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !contract) throw new Error('Contract not found');
    if (contract.owner_id !== ownerId) throw new Error('Unauthorized');
    if (contract.status === 'signed') throw new Error('Cannot void a signed contract');

    const { data, error } = await admin
      .from('contracts')
      .update({ status: 'voided', sent_date: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
