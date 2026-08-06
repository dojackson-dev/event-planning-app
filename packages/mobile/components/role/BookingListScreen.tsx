import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';

export interface RoleBooking {
  id: string;
  event_name?: string;
  event_date?: string;
  venue_name?: string;
  client_name?: string;
  agreed_amount?: number;
  status: string;
  created_at?: string;
  [key: string]: any;
}

export const bookingStatusMeta: Record<string, { label: string; bg: string; text: string }> = {
  pending:        { label: 'Pending',       bg: '#FEF3C7', text: '#92400E' },
  inquiry:        { label: 'Inquiry',       bg: '#FEF3C7', text: '#92400E' },
  estimate_sent:  { label: 'Estimate Sent', bg: '#DBEAFE', text: '#1E40AF' },
  deposit_paid:   { label: 'Deposit Paid',  bg: '#D1FAE5', text: '#065F46' },
  confirmed:      { label: 'Confirmed',     bg: '#D1FAE5', text: '#065F46' },
  declined:       { label: 'Declined',      bg: '#FEE2E2', text: '#991B1B' },
  completed:      { label: 'Completed',     bg: '#F3F4F6', text: '#6B7280' },
  cancelled:      { label: 'Cancelled',     bg: '#F3F4F6', text: '#6B7280' },
};

const fmt = (n?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

interface Props {
  /** Full API path to fetch, e.g. '/vendors/bookings/mine', '/artist-bookings/mine' */
  listPath: string;
  /** e.g. '/(tabs)/vendor-bookings' */
  routeBase: string;
  title?: string;
  emptyText?: string;
}

export default function BookingListScreen({ listPath, routeBase, title = 'Bookings', emptyText }: Props) {
  const router = useRouter();
  const [bookings, setBookings] = useState<RoleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiRequest<RoleBooking[]>(listPath);
      setBookings(data || []);
    } catch (err: any) {
      console.error(`Error fetching ${title.toLowerCase()}:`, err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listPath, title]);

  useFocusEffect(useCallback(() => { fetchBookings(); }, [fetchBookings]));

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={bookings}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      renderItem={({ item }) => {
        const meta = bookingStatusMeta[item.status] || { label: item.status, bg: '#F3F4F6', text: '#6B7280' };
        const eventDate = item.event_date
          ? new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`${routeBase}/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <Text style={styles.clientName} numberOfLines={1}>{item.client_name || 'Client'}</Text>
                {item.event_name && <Text style={styles.eventName} numberOfLines={1}>{item.event_name}</Text>}
                {(eventDate || item.venue_name) && (
                  <Text style={styles.metaText} numberOfLines={1}>
                    {[eventDate, item.venue_name].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <View style={styles.cardRight}>
                {item.agreed_amount != null && <Text style={styles.amount}>{fmt(item.agreed_amount)}</Text>}
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No {title.toLowerCase()}</Text>
          {emptyText && <Text style={styles.emptyText}>{emptyText}</Text>}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: 8 },
  cardRight: { alignItems: 'flex-end' },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  metaText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
