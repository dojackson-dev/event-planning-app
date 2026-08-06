import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface DashboardStats { totalEvents: number; publishedEvents: number; totalTicketsSold: number; totalRevenue: number; }
interface PromoterBooking { id: string; status: string; }
interface LinkRequest { id: string; status: string; }

const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

export default function PromoterDashboardScreen() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({ totalEvents: 0, publishedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 });
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profile, dashboard, artistBookings, linkRequests] = await Promise.all([
        apiRequest<{ company_name?: string }>('/promoter/profile').catch(() => null),
        apiRequest<DashboardStats>('/promoter/dashboard').catch(() => ({ totalEvents: 0, publishedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 })),
        apiRequest<PromoterBooking[]>('/promoter-bookings/mine').catch(() => []),
        apiRequest<LinkRequest[]>('/promoter/booking-links/requests').catch(() => []),
      ]);

      setCompanyName(profile?.company_name || '');
      setStats(dashboard);

      const pendingArtist = (artistBookings || []).filter(b => !['confirmed', 'cancelled', 'completed'].includes(b.status)).length;
      const pendingLinks = (linkRequests || []).filter(r => !['approved', 'declined', 'converted'].includes(r.status)).length;
      setPendingRequests(pendingArtist + pendingLinks);
    } catch (err: any) {
      console.error('Promoter dashboard load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{companyName || 'Welcome back'} 👋</Text>
          <Text style={styles.roleLabel}>Promoter Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {[
          { icon: 'calendar-outline', label: 'Total Events', value: stats.totalEvents, color: Colors.primary, bg: Colors.primaryLight, route: '/(tabs)/promoter-events' },
          { icon: 'megaphone-outline', label: 'Published', value: stats.publishedEvents, color: Colors.success, bg: Colors.successLight, route: '/(tabs)/promoter-events' },
          { icon: 'ticket-outline', label: 'Tickets Sold', value: stats.totalTicketsSold, color: Colors.purple, bg: Colors.purpleLight, route: '/(tabs)/promoter-events' },
          { icon: 'time-outline', label: 'Pending Requests', value: pendingRequests, color: Colors.warning, bg: Colors.warningLight, route: '/(tabs)/promoter-bookings' },
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

      <View style={[styles.revenueCard, Shadow.sm]}>
        <View style={styles.revenueRow}>
          <View>
            <Text style={styles.revenueLabel}>Ticket Sales Revenue</Text>
            <Text style={styles.revenueValue}>{fmt(stats.totalRevenue)}</Text>
          </View>
          <View style={styles.trendIcon}>
            <Ionicons name="trending-up" size={20} color={Colors.success} />
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.navGrid}>
        {[
          { icon: 'calendar', color: Colors.primary, bg: Colors.primaryLight, label: 'Events', route: '/(tabs)/promoter-events' },
          { icon: 'people-outline', color: Colors.purple, bg: Colors.purpleLight, label: 'Bookings', route: '/(tabs)/promoter-bookings' },
          { icon: 'receipt-outline', color: Colors.warning, bg: Colors.warningLight, label: 'Invoices', route: '/(tabs)/promoter-invoices' },
          { icon: 'person-outline', color: Colors.info, bg: Colors.infoLight, label: 'Profile', route: '/(tabs)/promoter-profile' },
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 20 },
  navCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, width: '47%', alignItems: 'center', gap: 8,
  },
  navIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
});
