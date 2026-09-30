import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';

interface PromoterBooking {
  id: string;
  event_name: string;
  client_name: string;
  event_date?: string | null;
  event_start_time?: string | null;
  venue_name?: string | null;
  agreed_amount?: number | null;
  status: string;
  artist_name?: string | null;
  artist_accounts?: { artist_name?: string; stage_name?: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  inquiry: { bg: '#F3F4F6', text: '#374151' },
  estimate_sent: { bg: '#DBEAFE', text: '#1D4ED8' },
  deposit_paid: { bg: '#FEF3C7', text: '#B45309' },
  confirmed: { bg: '#D1FAE5', text: '#047857' },
  completed: { bg: '#EDE9FE', text: '#6D28D9' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<PromoterBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<PromoterBooking[]>('/promoter-bookings/mine');
      setBookings(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
      renderItem={({ item }) => {
        const sc = STATUS_COLORS[item.status] || STATUS_COLORS.inquiry;
        const artistName = item.artist_accounts?.stage_name || item.artist_accounts?.artist_name || item.artist_name;
        return (
          <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            activeOpacity={0.85}
            onPress={() => router.push(`/(promoter)/bookings/${item.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.eventName} numberOfLines={1}>{item.event_name}</Text>
              <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                <Text style={[styles.pillText, { color: sc.text }]}>{STATUS_LABELS[item.status] || item.status}</Text>
              </View>
            </View>
            {artistName && (
              <View style={styles.row}>
                <Ionicons name="mic-outline" size={13} color={Colors.purple} />
                <Text style={styles.artistText}>{artistName}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.client_name}</Text>
            </View>
            {item.event_date && (
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>
                  {item.event_date}{item.event_start_time ? ` at ${item.event_start_time}` : ''}
                </Text>
              </View>
            )}
            {item.venue_name && (
              <View style={styles.row}>
                <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1}>{item.venue_name}</Text>
              </View>
            )}
            {item.agreed_amount != null && (
              <Text style={styles.amount}>${Number(item.agreed_amount).toLocaleString()}</Text>
            )}
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="mic-outline"
          title="No bookings yet"
          message="Book an artist for one of your events to see it here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  list: { padding: 16, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 12,
    gap: 5,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  artistText: { fontSize: 12, color: Colors.purple, fontWeight: '600' },
  metaText: { fontSize: 12, color: Colors.textMuted },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
});
