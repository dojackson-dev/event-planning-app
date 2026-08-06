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

interface ArtistBooking { id: string; status: string; event_date?: string; }
interface PromoterBookingRequest { id: string; status: string; event_date?: string; }
interface ArtistInvoice { id: string; status: string; amount_due: number; amount_paid: number; }

const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

export default function ArtistDashboardScreen() {
  const router = useRouter();
  const [artistName, setArtistName] = useState('');
  const [pendingRequests, setPendingRequests] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profile, myBookings, requests, invoices] = await Promise.all([
        apiRequest<{ artist_name?: string; stage_name?: string }>('/artists/me/profile').catch(() => null),
        apiRequest<ArtistBooking[]>('/artist-bookings/mine').catch(() => []),
        apiRequest<PromoterBookingRequest[]>('/promoter-bookings/for-artist').catch(() => []),
        apiRequest<ArtistInvoice[]>('/artist-invoices/mine').catch(() => []),
      ]);

      setArtistName(profile?.stage_name || profile?.artist_name || '');

      const today = new Date().toISOString().slice(0, 10);
      const pendingReq = (requests || []).filter(r => !['confirmed', 'cancelled'].includes(r.status)).length;
      setPendingRequests(pendingReq);
      setUpcomingBookings((myBookings || []).filter(b =>
        b.event_date && b.event_date >= today && !['cancelled', 'completed'].includes(b.status)
      ).length);

      const unpaid = (invoices || []).filter(i => !['paid', 'cancelled'].includes(i.status));
      setOutstanding(unpaid.reduce((s, i) => s + Number(i.amount_due ?? 0), 0));
      setRevenue((invoices || []).reduce((s, i) => s + Number(i.amount_paid ?? 0), 0));
    } catch (err: any) {
      console.error('Artist dashboard load error:', err.message);
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
          <Text style={styles.greeting}>{artistName || 'Welcome back'} 👋</Text>
          <Text style={styles.roleLabel}>Artist Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {[
          { icon: 'mail-unread-outline', label: 'Booking Requests', value: pendingRequests, color: Colors.warning, bg: Colors.warningLight, route: '/(tabs)/artist-bookings' },
          { icon: 'calendar-outline', label: 'Upcoming Bookings', value: upcomingBookings, color: Colors.primary, bg: Colors.primaryLight, route: '/(tabs)/artist-bookings' },
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
            <Text style={styles.revenueLabel}>Total Revenue Collected</Text>
            <Text style={styles.revenueValue}>{fmt(revenue)}</Text>
          </View>
          <View style={styles.trendIcon}>
            <Ionicons name="trending-up" size={20} color={Colors.success} />
          </View>
        </View>
        {outstanding > 0 && <Text style={styles.revenueNote}>{fmt(outstanding)} pending collection</Text>}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.navGrid}>
        {[
          { icon: 'calendar', color: Colors.primary, bg: Colors.primaryLight, label: 'Bookings', route: '/(tabs)/artist-bookings' },
          { icon: 'receipt-outline', color: Colors.warning, bg: Colors.warningLight, label: 'Invoices', route: '/(tabs)/artist-invoices' },
          { icon: 'person-outline', color: Colors.purple, bg: Colors.purpleLight, label: 'Profile', route: '/(tabs)/artist-profile' },
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
  revenueNote: { fontSize: 12, color: Colors.warning, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 20 },
  navCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, width: '30%', alignItems: 'center', gap: 8,
  },
  navIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
});
