import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  // Map intake_form row to a User-like shape expected by the frontend
  private toUser(form: any) {
    // Support both column naming conventions
    const fullName = form.client_name || form.contact_name || '';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      id: form.id,
      firstName,
      lastName,
      email: form.email || form.contact_email || '',
      phone: form.phone || form.contact_phone || null,
      role: 'customer',
      smsOptIn: form.sms_opt_in ?? false,
    };
  }

  async findAll(supabase: any, ownerId: string) {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('id, contact_name, contact_email, contact_phone, sms_opt_in')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback: try without sms_opt_in in case column doesn't exist yet
      const { data: fallback, error: fallbackError } = await supabase
        .from('intake_forms')
        .select('id, contact_name, contact_email, contact_phone')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (fallbackError) throw new Error(fallbackError.message);
      const seen = new Set<string>();
      return (fallback || []).reduce((acc: any[], form: any) => {
        const key = form.contact_email || form.contact_phone || form.id;
        if (!seen.has(key)) { seen.add(key); acc.push(this.toUser(form)); }
        return acc;
      }, []);
    }

    // Deduplicate by email/phone
    const seen = new Set<string>();
    return (data || []).reduce((acc: any[], form: any) => {
      const key = form.contact_email || form.contact_phone || form.id;
      if (!seen.has(key)) {
        seen.add(key);
        acc.push(this.toUser(form));
      }
      return acc;
    }, []);
  }

  async findOne(supabase: any, ownerId: string, id: string) {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('id, contact_name, contact_email, contact_phone, sms_opt_in')
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data ? this.toUser(data) : null;
  }
}
