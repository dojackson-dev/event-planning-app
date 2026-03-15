import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  // Map intake_form row to a User-like shape expected by the frontend
  private toUser(form: any) {
    const nameParts = (form.client_name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      id: form.id,
      firstName,
      lastName,
      email: form.email || '',
      phone: form.phone || null,
      role: 'customer',
    };
  }

  async findAll(supabase: any, ownerId: string) {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('id, client_name, email, phone')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Deduplicate by email/phone
    const seen = new Set<string>();
    return (data || []).reduce((acc: any[], form: any) => {
      const key = form.email || form.phone || form.id;
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
      .select('id, client_name, email, phone')
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data ? this.toUser(data) : null;
  }
}
