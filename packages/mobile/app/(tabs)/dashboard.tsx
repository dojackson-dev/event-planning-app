import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface Stats {
  upcomingEvents: number;
  confirmedBookings: number;
  totalClients: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  revenue: number;
}

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    upcomingEvents: 0, confirmedBookings: 0, totalClients: 0,
    unpaidInvoices: 0, unpaidAmount: 0, revenue: 0,
  });
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('owner');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserName(user.email?.split('@')[0] || 'there');

      // Fetch role from users table
      const { data: dbUser } = await supabase
        .from('users').select('role, first_name').eq('id', user.id).maybeSingle();
      if (dbUser?.role) setUserRole(dbUser.role);
      if (dbUser?.first_name) setUserName(dbUser.first_name);

      const today = new Date().toISOString().split('T')[0];
      const [eventsRes, bookingsRes, clientsRes, invoicesRes] = await Promise.all([
        supabase.from('event').select('id').eq('owner_id', user.id).gte('date', today),
        supabase.from('booking').select('id, total_amount').eq('user_id', user.id).in('client_status', ['deposit_paid', 'completed']),
        supabase.from('intake_forms').select('id').eq('user_id', user.id),
        supabase.from('invoices').select('id, status, amount_due, amount_paid').eq('owner_id', user.id),
      ]);

      const invoices = invoicesRes.data || [];
      const unpaid = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && Number(i.amount_due ?? 0) > 0);
      const revenue = invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);

      setStats({
        upcomingEvents: (eventsRes.data || []).length,
        confirmedBookings: (bookingsRes.data || []).length,
        totalClients: (clientsRes.data || []).length,
        unpaidInvoices: unpaid.length,
        unpaidAmount: unpaid.reduce((s, i) => s + Number(i.amount_due ?? 0), 0),
        revenue,
      });
    } catch (err: any) {
      console.error('Dashboard load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back, {userName} 👋</Text>
          <Text style={styles.roleLabel}>{userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        {[
          { icon: 'calendar-outline', label: 'Upcoming Events', value: stats.upcomingEvents, color: Colors.primary, bg: Colors.primaryLight, route: '/(tabs)/events' },
          { icon: 'checkmark-circle-outline', label: 'Booked Events', value: stats.confirmedBookings, color: Colors.success, bg: Colors.successLight, route: '/(tabs)/bookings' },
          { icon: 'people-outline', label: 'Total Clients', value: stats.totalClients, color: Colors.purple, bg: Colors.purpleLight, route: '/(tabs)/clients' },
          { icon: 'receipt-outline', label: 'Unpaid Invoices', value: stats.unpaidInvoices, color: Colors.error, bg: Colors.errorLight, route: '/(tabs)/invoices' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.statCard, Shadow.sm]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={[styles.statNumber, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue */}
      <View style={[styles.revenueCard, Shadow.sm]}>
        <View style={styles.revenueRow}>
          <View>
            <Text style={styles.revenueLabel}>Total Revenue Collected</Text>
            <Text style={styles.revenueValue}>{fmt(stats.revenue)}</Text>
          </View>
          <View style={styles.trendIcon}>
            <Ionicons name="trending-up" size={20} color={Colors.success} />
          </View>
        </View>
        {stats.unpaidAmount > 0 && (
          <Text style={styles.revenueNote}>{fmt(stats.unpaidAmount)} pending collection</Text>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.navGrid}>
        {[
          { icon: 'calendar', color: Colors.primary, bg: Colors.primaryLight, label: 'Events', route: '/(tabs)/events' },
          { icon: 'checkmark-circle', color: Colors.success, bg: Colors.successLight, label: 'Booked', route: '/(tabs)/bookings' },
          { icon: 'people', color: Colors.purple, bg: Colors.purpleLight, label: 'Clients', route: '/(tabs)/clients' },
          { icon: 'calendar-outline', color: '#0EA5E9', bg: '#E0F2FE', label: 'Calendar', route: '/(tabs)/calendar' },
          { icon: 'document-text-outline', color: '#F59E0B', bg: '#FEF3C7', label: 'Estimates', route: '/(tabs)/estimates' },
          { icon: 'receipt-outline', color: Colors.warning, bg: Colors.warningLight, label: 'Invoices', route: '/(tabs)/invoices' },
          { icon: 'chatbubble-ellipses-outline', color: '#10B981', bg: '#D1FAE5', label: 'Messages', route: '/(tabs)/messages' },
          { icon: 'business-outline', color: '#8B5CF6', bg: '#EDE9FE', label: 'Venues', route: '/(tabs)/venues' },
          { icon: 'storefront-outline', color: Colors.primary, bg: Colors.primaryLight, label: 'Vendors', route: '/(tabs)/vendors' },
          { icon: 'cash-outline', color: '#F59E0B', bg: '#FEF3C7', label: 'Vendor Invoices', route: '/(tabs)/vendor-invoices' },
          { icon: 'link-outline', color: '#0EA5E9', bg: '#E0F2FE', label: 'Booking Link', route: '/(tabs)/booking-link' },
          { icon: 'clipboard-outline', color: '#EF4444', bg: '#FEE2E2', label: 'Door Lists', route: '/(tabs)/door-lists' },
          { icon: 'document-lock-outline', color: '#6366F1', bg: '#E0E7FF', label: 'Contracts', route: '/(tabs)/contracts' },
          { icon: 'settings-outline', color: '#6B7280', bg: '#F3F4F6', label: 'Settings', route: '/(tabs)/settings' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.navCard, Shadow.sm]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.navIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Switch to attendee view */}
      <TouchableOpacity style={styles.switchBtn} onPress={() => router.replace('/(tabs)/')}>
        <Ionicons name="earth-outline" size={16} color={Colors.primary} />
        <Text style={styles.switchText}>Browse EventEcos as Attendee</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  roleLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  logoutBtn: { padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, width: '47%', gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  revenueCard: {
    backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: Radius.xl,
    padding: 20, marginBottom: 20,
  },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 13, color: Colors.textSecondary },
  revenueValue: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  trendIcon: {
    width: 40, height: 40, backgroundColor: Colors.successLight,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  revenueNote: { fontSize: 12, color: Colors.warning, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 20 },
  navCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, width: '22%', alignItems: 'center', gap: 8,
  },
  navIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  switchText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
