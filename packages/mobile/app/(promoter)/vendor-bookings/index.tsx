import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';

interface PromoterVendorBooking {
  id: string;
  event_name?: string;
  event_date?: string;
  status: string;
  agreed_amount?: number;
  vendor_accounts?: { business_name?: string; category?: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  declined: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  completed: { bg: '#DBEAFE', text: '#1E40AF' },
  paid: { bg: '#EDE9FE', text: '#6D28D9' },
};

export default function PromoterVendorBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<PromoterVendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<PromoterVendorBooking[]>('/vendors/bookings/booked-by-me');
      setBookings(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load vendor bookings');
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
        const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
        return (
          <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            activeOpacity={0.85}
            onPress={() => router.push(`/(promoter)/vendor-bookings/${item.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.eventName} numberOfLines={1}>{item.event_name || 'Booking'}</Text>
              <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                <Text style={[styles.pillText, { color: sc.text }]}>{item.status}</Text>
              </View>
            </View>
            {item.vendor_accounts?.business_name && (
              <View style={styles.row}>
                <Ionicons name="storefront-outline" size={13} color={Colors.purple} />
                <Text style={styles.vendorText}>{item.vendor_accounts.business_name}</Text>
              </View>
            )}
            {item.event_date && (
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{item.event_date}</Text>
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
          icon="storefront-outline"
          title="No vendor bookings yet"
          message="Book a vendor for your event and it will show up here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  eventName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  vendorText: { fontSize: 13, color: Colors.purple, fontWeight: '600' },
  metaText: { fontSize: 13, color: Colors.textMuted },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
});
