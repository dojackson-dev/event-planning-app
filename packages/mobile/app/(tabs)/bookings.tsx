import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Shadow, Radius } from '@/lib/theme';

interface Booking {
  id: string;
  client_status: string;
  contact_name?: string;
  contact_phone?: string;
  total_amount?: number;
  deposit_amount?: number;
  created_at: string;
  event?: { id: string; name: string; date: string; venue?: string } | null;
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('booking')
        .select('*, event:event(id, name, date, venue)')
        .eq('user_id', user.id)
        .in('client_status', ['deposit_paid', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const getStatus = (status: string) => {
    if (status === 'deposit_paid') return { label: 'Deposit Paid', bg: '#D1FAE5', text: '#065F46' };
    if (status === 'completed')    return { label: 'Completed',    bg: '#F3F4F6', text: '#6B7280' };
    return { label: status, bg: '#F3F4F6', text: '#6B7280' };
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      renderItem={({ item }) => {
        const st = getStatus(item.client_status);
        const eventDate = item.event?.date
          ? new Date(item.event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null;
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <Text style={styles.clientName} numberOfLines={1}>{item.contact_name || 'Client'}</Text>
                {item.event?.name && <Text style={styles.eventName} numberOfLines={1}>{item.event.name}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaRow}>
              {eventDate && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.metaText}>{eventDate}</Text>
                </View>
              )}
              {item.event?.venue && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.metaText} numberOfLines={1}>{item.event.venue}</Text>
                </View>
              )}
              {item.total_amount != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.metaText}>${Number(item.total_amount).toLocaleString()}</Text>
                </View>
              )}
              {item.contact_phone && (
                <View style={styles.metaItem}>
                  <Ionicons name="call-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.metaText}>{item.contact_phone}</Text>
                </View>
              )}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No booked events yet</Text>
          <Text style={styles.emptyText}>Events with a paid deposit appear here</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, gap: 12 },
  cardLeft: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  eventName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#6B7280' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
