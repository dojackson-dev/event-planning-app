import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getDashboardStats() {
    const supabase = this.supabaseService.getAdminClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalOwners },
      { count: newOwnersThisMonth },
      { count: totalClients },
      { count: newClientsThisMonth },
      { count: totalEvents },
      { count: totalBookings },
      { data: recentOwnersData },
      { data: invoicesData },
      { count: activeTrials },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner').gte('created_at', startOfMonth),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', startOfMonth),
      supabase.from('event').select('*', { count: 'exact', head: true }),
      supabase.from('booking').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('id, email, first_name, last_name, created_at').eq('role', 'owner').order('created_at', { ascending: false }).limit(10),
      supabase.from('invoices').select('total_amount').eq('status', 'paid'),
      supabase.from('owner_accounts').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
    ]);

    const totalRevenue = invoicesData?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0;

    return {
      stats: {
        totalOwners: totalOwners || 0,
        totalClients: totalClients || 0,
        totalEvents: totalEvents || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        activeTrials: activeTrials || 0,
        newOwnersThisMonth: newOwnersThisMonth || 0,
        newClientsThisMonth: newClientsThisMonth || 0,
      },
      recentOwners: recentOwnersData || [],
    };
  }

  async getOwners(page = 1, limit = 20, search = '') {
    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone_number, created_at, status', { count: 'exact' })
      .eq('role', 'owner')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,business_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Enrich with owner_accounts subscription info
    const ownerIds = (data || []).map((o: any) => o.id);
    const { data: accounts } = ownerIds.length
      ? await supabase.from('owner_accounts').select('primary_owner_id, business_name, subscription_status, trial_ends_at, stripe_customer_id').in('primary_owner_id', ownerIds)
      : { data: [] };

    const accountMap = new Map((accounts || []).map((a: any) => [a.primary_owner_id, a]));
    const enriched = (data || []).map((owner: any) => {
      const acct = accountMap.get(owner.id) || null;
      return {
        ...owner,
        phone: owner.phone_number,
        business_name: acct?.business_name || null,
        subscription: acct ? {
          subscription_status: acct.subscription_status,
          trial_ends_at: acct.trial_ends_at,
          stripe_customer_id: acct.stripe_customer_id,
        } : null,
      };
    });

    return { owners: enriched, total: count || 0, page, limit };
  }

  async getEvents(page = 1, limit = 20, search = '', ownerId = '') {
    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('event')
      .select('id, name, description, date, start_time, end_time, venue, location, guest_count, status, owner_id, budget, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Enrich with owner info
    const ownerIds = [...new Set((data || []).map((e: any) => e.owner_id).filter(Boolean))];
    const { data: owners } = ownerIds.length
      ? await supabase.from('users').select('id, email, first_name, last_name').in('id', ownerIds)
      : { data: [] };

    const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
    const enriched = (data || []).map((event: any) => ({
      ...event,
      owner: ownerMap.get(event.owner_id) || null,
    }));

    return { events: enriched, total: count || 0, page, limit };
  }

  async getBookings(page = 1, limit = 20, search = '', ownerId = '') {
    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('booking')
      .select(
        'id, event_id, user_id, owner_id, contact_name, contact_email, contact_phone, status, payment_status, total_amount, deposit_amount, booking_date, notes, created_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }
    if (ownerId) {
      query = query.eq('user_id', ownerId);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Enrich with event name
    const eventIds = [...new Set((data || []).map((b: any) => b.event_id).filter(Boolean))];
    const { data: events } = eventIds.length
      ? await supabase.from('event').select('id, name, date').in('id', eventIds)
      : { data: [] };
    const eventMap = new Map((events || []).map((e: any) => [e.id, e]));

    // Enrich with owner info (user_id is the owner)
    const ownerIds = [...new Set((data || []).map((b: any) => b.user_id).filter(Boolean))];
    const { data: owners } = ownerIds.length
      ? await supabase.from('users').select('id, email, first_name, last_name').in('id', ownerIds)
      : { data: [] };
    const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));

    const enriched = (data || []).map((b: any) => ({
      ...b,
      event: eventMap.get(b.event_id) || null,
      owner: ownerMap.get(b.user_id) || null,
    }));

    return { bookings: enriched, total: count || 0, page, limit };
  }

  async getClients(page = 1, limit = 20, search = '') {
    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone_number, created_at, status', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { clients: data || [], total: count || 0, page, limit };
  }

  async getRevenue() {
    const supabase = this.supabaseService.getAdminClient();

    const [{ data: accounts }, { data: paidInvoices }] = await Promise.all([
      supabase.from('owner_accounts').select('id, subscription_status, primary_owner_id'),
      supabase.from('invoices').select('id, total_amount, status, created_at, owner_id').eq('status', 'paid').order('created_at', { ascending: false }).limit(50),
    ]);

    const activeSubscriptions = (accounts || []).filter((a: any) => ['active', 'trialing'].includes(a.subscription_status)).length;
    const cancelledSubscriptions = (accounts || []).filter((a: any) => a.subscription_status === 'cancelled').length;
    const totalRevenue = (paidInvoices || []).reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);

    const now = new Date();
    const monthlyData: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyData[d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })] = 0;
    }
    (paidInvoices || []).forEach((inv: any) => {
      const key = new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyData[key] !== undefined) monthlyData[key] += inv.total_amount || 0;
    });
    const revenueByMonth = Object.entries(monthlyData).map(([month, amount]) => ({ month, amount }));

    const ownerIds = [...new Set((paidInvoices || []).map((i: any) => i.owner_id).filter(Boolean))];
    const { data: owners } = ownerIds.length
      ? await supabase.from('users').select('id, first_name, last_name').in('id', ownerIds)
      : { data: [] };
    const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));

    const recentPayments = (paidInvoices || []).slice(0, 10).map((inv: any) => {
      const owner: any = ownerMap.get(inv.owner_id);
      return {
        id: inv.id,
        owner_name: owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown Owner',
        amount: inv.total_amount || 0,
        status: 'succeeded',
        created_at: inv.created_at,
      };
    });

    return {
      totalRevenue,
      monthlyRevenue: activeSubscriptions * 29.99,
      activeSubscriptions,
      cancelledSubscriptions,
      revenueByMonth,
      recentPayments,
    };
  }

  async getAnalytics() {
    const supabase = this.supabaseService.getAdminClient();
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    const [
      { count: totalOwners },
      { count: totalClients },
      { count: totalEvents },
      { count: totalBookings },
      { data: recentOwners },
      { data: recentClients },
      { data: recentEvents },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('event').select('*', { count: 'exact', head: true }),
      supabase.from('booking').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('id, created_at').eq('role', 'owner').gte('created_at', sixMonthsAgo),
      supabase.from('users').select('id, created_at').eq('role', 'customer').gte('created_at', sixMonthsAgo),
      supabase.from('event').select('id, created_at').gte('created_at', sixMonthsAgo),
    ]);

    const buildMonthly = (items: any[]) => {
      const months: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months[d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })] = 0;
      }
      (items || []).forEach((item: any) => {
        if (!item.created_at) return;
        const key = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (months[key] !== undefined) months[key]++;
      });
      return Object.entries(months).map(([month, count]) => ({ month, count }));
    };

    const calcGrowth = (items: any[]) => {
      const thisMonth = (items || []).filter((item: any) => {
        const d = new Date(item.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = (items || []).filter((item: any) => {
        const d = new Date(item.created_at);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      }).length;
      if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
      return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    };

    return {
      totalOwners: totalOwners || 0,
      totalClients: totalClients || 0,
      totalEvents: totalEvents || 0,
      totalBookings: totalBookings || 0,
      monthlyGrowth: {
        owners: calcGrowth(recentOwners || []),
        clients: calcGrowth(recentClients || []),
        events: calcGrowth(recentEvents || []),
        bookings: 0,
      },
      ownersByMonth: buildMonthly(recentOwners || []),
      clientsByMonth: buildMonthly(recentClients || []),
      eventsByMonth: buildMonthly(recentEvents || []),
    };
  }

  async getActivity(page = 1, limit = 100, search = '', roleFilter = '') {
    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, last_sign_in_at, login_count, created_at', { count: 'exact' })
      .order('last_sign_in_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { activity: data || [], total: count || 0, page, limit };
  }

  async getTrials(page = 1, limit = 50, search = '') {
    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    const { data: accounts, count, error } = await supabase
      .from('owner_accounts')
      .select('id, primary_owner_id, subscription_status, trial_ends_at, trial_days_used, created_at', { count: 'exact' })
      .eq('subscription_status', 'trialing')
      .order('trial_ends_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const ownerIds = (accounts || []).map((a: any) => a.primary_owner_id).filter(Boolean);
    const { data: owners } = ownerIds.length
      ? await supabase.from('users').select('id, email, first_name, last_name').in('id', ownerIds)
      : { data: [] };
    const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));

    const now = Date.now();
    let enriched = (accounts || []).map((a: any) => ({
      ...a,
      owner: ownerMap.get(a.primary_owner_id) || null,
      daysRemaining: a.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(a.trial_ends_at).getTime() - now) / 86400000))
        : null,
    }));

    if (search) {
      const s = search.toLowerCase();
      enriched = enriched.filter((a: any) =>
        a.owner?.email?.toLowerCase().includes(s) ||
        a.owner?.first_name?.toLowerCase().includes(s) ||
        a.owner?.last_name?.toLowerCase().includes(s),
      );
    }

    return { trials: enriched, total: count || 0, page, limit };
  }

  async updateOwnerTrial(ownerId: string, action: string, days?: number) {
    const supabase = this.supabaseService.getAdminClient();

    if (action === 'end') {
      const { data, error } = await supabase
        .from('owner_accounts')
        .update({ subscription_status: 'cancelled', trial_ends_at: null })
        .eq('primary_owner_id', ownerId)
        .select().maybeSingle();
      if (error) throw error;
      return data;
    }

    const trialDays = days || 14;

    if (action === 'grant') {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
      const { data, error } = await supabase
        .from('owner_accounts')
        .update({ subscription_status: 'trialing', trial_ends_at: trialEndDate.toISOString() })
        .eq('primary_owner_id', ownerId)
        .select().maybeSingle();
      if (error) throw error;
      return data;
    }

    // extend
    const { data: account } = await supabase
      .from('owner_accounts')
      .select('trial_ends_at')
      .eq('primary_owner_id', ownerId)
      .maybeSingle();
    const currentEnd = account?.trial_ends_at ? new Date(account.trial_ends_at) : new Date();
    currentEnd.setDate(currentEnd.getDate() + trialDays);
    const { data, error } = await supabase
      .from('owner_accounts')
      .update({ trial_ends_at: currentEnd.toISOString() })
      .eq('primary_owner_id', ownerId)
      .select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async getOwnerDetail(ownerId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const [{ data: user }, { data: account }, { count: eventCount }, { count: invoiceCount }, { data: invoices }] = await Promise.all([
      supabase.from('users').select('*').eq('id', ownerId).single(),
      supabase.from('owner_accounts').select('*').eq('primary_owner_id', ownerId).maybeSingle(),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
      supabase.from('invoices').select('total_amount, status').eq('owner_id', ownerId),
    ]);

    const totalRevenue = (invoices || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

    return { user, account, eventCount: eventCount || 0, invoiceCount: invoiceCount || 0, totalRevenue };
  }

  async updateOwnerStatus(ownerId: string, status: string) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.from('users').update({ status }).eq('id', ownerId).select().single();
    if (error) throw error;
    return data;
  }

  async getTrialSettings() {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'FREE_TRIAL_DAYS').single();
    return { trialDays: data?.value ? parseInt(data.value) : 30 };
  }

  async updateTrialSettings(trialDays: number) {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key: 'FREE_TRIAL_DAYS', value: String(trialDays) }, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    return { trialDays };
  }
}
