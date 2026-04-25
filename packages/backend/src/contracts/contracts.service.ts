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
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true });
    const contractNumber = `CON-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, '0')}`;

    // Auto-populate client contact info from the linked intake form so that
    // sendContract() can SMS the client without a separate lookup.
    let clientName: string | undefined = contractData.client_name;
    let clientPhone: string | undefined = contractData.client_phone;
    let clientEmail: string | undefined = contractData.client_email;

    const admin = this.supabaseService.getAdminClient();

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

    const { data, error } = await supabase
      .from('contracts')
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error('[ContractsService] insert error:', error.message, error.details, error.hint);
      throw error;
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

    // Notify client via SMS
    try {
      const clientPhone: string | null =
        data.client_phone ?? data.contact_phone ?? null;
      const clientName: string = data.client_name ?? data.contact_name ?? 'Valued Client';
      const contractNumber: string = data.contract_number ?? id;
      await this.smsNotifications.contractSent(clientPhone, clientName, contractNumber);
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

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
