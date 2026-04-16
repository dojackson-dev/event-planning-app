import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Shadow, Radius } from '@/lib/theme';

interface Stats {
  upcomingEvents: number;
  confirmedBookings: number;
  totalClients: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  revenue: number;
}

interface UpcomingEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    upcomingEvents: 0,
    confirmedBookings: 0,
    totalClients: 0,
    unpaidInvoices: 0,
    unpaidAmount: 0,
    revenue: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserName(user.email?.split('@')[0] || 'there');

      const today = new Date().toISOString().split('T')[0];

      const [eventsRes, bookingsRes, clientsRes, invoicesRes] = await Promise.all([
        supabase.from('event').select('id, name, date, venue').eq('owner_id', user.id).gte('date', today).order('date').limit(5),
        supabase.from('booking').select('id, client_status, total_amount').eq('user_id', user.id).in('client_status', ['deposit_paid', 'completed']),
        supabase.from('intake_forms').select('id').eq('user_id', user.id),
        supabase.from('invoices').select('id, status, amount_due, amount_paid').eq('owner_id', user.id),
      ]);

      const events = eventsRes.data || [];
      const bookings = bookingsRes.data || [];
      const clients = clientsRes.data || [];
      const invoices = invoicesRes.data || [];

      const unpaid = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled' && Number(inv.amount_due ?? 0) > 0);
      const revenue = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid ?? 0), 0);

      setStats({
        upcomingEvents: events.length,
        confirmedBookings: bookings.length,
        totalClients: clients.length,
        unpaidInvoices: unpaid.length,
        unpaidAmount: unpaid.reduce((sum, inv) => sum + Number(inv.amount_due ?? 0), 0),
        revenue,
      });

      setUpcomingEvents(events.slice(0, 3));
    } catch (err: any) {
      console.error('Error loading dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

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
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Welcome back, {userName} 👋</Text>
        <Text style={styles.greetingSubtext}>Here's what's happening today</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={[styles.statCard, styles.statBlue]} onPress={() => router.push('/(tabs)/events')}>
          <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
          <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
          <Text style={styles.statLabel}>Upcoming Events</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.statGreen]} onPress={() => router.push('/(tabs)/bookings')}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
          <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.confirmedBookings}</Text>
          <Text style={styles.statLabel}>Booked Events</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.statPurple]} onPress={() => router.push('/(tabs)/clients')}>
          <Ionicons name="people-outline" size={22} color={Colors.purple} />
          <Text style={[styles.statNumber, { color: Colors.purple }]}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.statRed]} onPress={() => router.push('/(tabs)/invoices')}>
          <Ionicons name="receipt-outline" size={22} color={Colors.error} />
          <Text style={[styles.statNumber, { color: Colors.error }]}>{stats.unpaidInvoices}</Text>
          <Text style={styles.statLabel}>Unpaid Invoices</Text>
        </TouchableOpacity>
      </View>

      {/* Revenue Card */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueRow}>
          <View>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>{fmt(stats.revenue)}</Text>
          </View>
          <View style={styles.revenueBadge}>
            <Ionicons name="trending-up" size={18} color={Colors.success} />
          </View>
        </View>
        {stats.unpaidAmount > 0 && (
          <Text style={styles.revenueNote}>
            {fmt(stats.unpaidAmount)} pending collection
          </Text>
        )}
      </View>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          {upcomingEvents.map(event => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.eventDateBadge}>
                <Text style={styles.eventDateDay}>
                  {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                </Text>
                <Text style={styles.eventDateMonth}>
                  {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                {event.venue && (
                  <Text style={styles.eventVenue} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color={Colors.textMuted} /> {event.venue}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'calendar-outline', label: 'Events', route: '/(tabs)/events' },
            { icon: 'checkmark-circle-outline', label: 'Booked', route: '/(tabs)/bookings' },
            { icon: 'people-outline', label: 'Clients', route: '/(tabs)/clients' },
            { icon: 'receipt-outline', label: 'Invoices', route: '/(tabs)/invoices' },
          ].map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionItem}
              onPress={() => router.push(action.route as any)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon as any} size={22} color={Colors.primary} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Profile link */}
      <TouchableOpacity style={styles.profileLink} onPress={() => router.push('/(tabs)/profile')}>
        <Ionicons name="person-circle-outline" size={20} color={Colors.textSecondary} />
        <Text style={styles.profileLinkText}>Account & Settings</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  greeting: { marginBottom: 20 },
  greetingText: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  greetingSubtext: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, gap: 6, ...Shadow.md,
  },
  statBlue: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  statGreen: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  statPurple: { borderLeftWidth: 3, borderLeftColor: Colors.purple },
  statRed: { borderLeftWidth: 3, borderLeftColor: Colors.error },
  statNumber: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  revenueCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 20,
    marginBottom: 20, ...Shadow.md,
  },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  revenueValue: { fontSize: 32, fontWeight: '700', color: Colors.textWhite, marginTop: 4 },
  revenueBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  revenueNote: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm,
  },
  eventDateBadge: {
    width: 44, height: 44, backgroundColor: Colors.primaryLight, borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  eventDateDay: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  eventDateMonth: { fontSize: 10, fontWeight: '600', color: Colors.primaryText, textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  eventVenue: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionItem: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 52, height: 52, backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center',
  },
  actionLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  profileLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: 14, ...Shadow.sm,
  },
  profileLinkText: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
});
