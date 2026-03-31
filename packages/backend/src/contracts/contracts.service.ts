import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly smsNotifications: SmsNotificationsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async findAll(supabase: SupabaseClient): Promise<any[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async findByOwner(supabase: SupabaseClient, ownerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
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

    if (contractData.intake_form_id && (!clientPhone || !clientName)) {
      const admin = this.supabaseService.getAdminClient();
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
    if (error) throw error;
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
          .select('phone')
          .eq('id', data.owner_id)
          .single();
        const ownerPhone: string | null = (ownerUser as any)?.phone ?? null;
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
