import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

// Shape returned by GET /vendors/bookings/owner (vendor_bookings row + joined
// vendor_accounts relation), per frontend `Booking`/`EventVendorBooking`
// consumer interfaces (packages/frontend/src/lib/vendorTypes.ts and
// dashboard/events/[id]/manage/page.tsx).
interface VendorBooking {
  id: string;
  vendor_account_id: string;
  event_name?: string;
  event_date?: string;
  status: string;
  agreed_amount?: number;
  deposit_amount?: number;
  notes?: string;
  vendor_accounts?: { business_name?: string; category?: string; profile_image_url?: string } | null;
}

// Confirmed enum from packages/backend/migrations/add-vendors.sql
// vendor_bookings.status CHECK constraint.
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  declined: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  completed: { bg: '#DBEAFE', text: '#1E40AF' },
};

export default function VendorBookingsScreen() {
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiRequest<any>('/vendors/bookings/owner');
      setBookings(Array.isArray(data) ? data : (data?.bookings || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load your vendor bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCancel = (booking: VendorBooking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your booking request${booking.event_name ? ` for "${booking.event_name}"` : ''}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(booking.id);
            try {
              // NOTE: PUT /vendors/bookings/:id is documented primarily as a
              // vendor-side action (accept/decline/complete). Owner permission
              // to cancel here is unconfirmed from source — handled defensively.
              await apiRequest(`/vendors/bookings/${booking.id}`, {
                method: 'PUT',
                body: { status: 'cancelled' },
              });
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not update this booking.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
      renderItem={({ item }) => {
        const st = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
        const canCancel = ['pending', 'confirmed'].includes(item.status);
        return (
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vendorName}>{item.vendor_accounts?.business_name || 'Vendor'}</Text>
                {item.event_name && <Text style={styles.eventName}>{item.event_name}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.text }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaRow}>
              {item.event_date && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{item.event_date}</Text>
                </View>
              )}
              {item.agreed_amount != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>${Number(item.agreed_amount).toLocaleString()}</Text>
                </View>
              )}
            </View>
            {canCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item)}
                disabled={updatingId === item.id}
              >
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons
            name={error ? 'alert-circle-outline' : 'briefcase-outline'}
            size={48}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : 'No vendor bookings yet'}</Text>
          <Text style={styles.emptyText}>
            {error || 'Bookings you request from vendors will appear here.'}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  vendorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted },
  cancelBtn: {
    marginTop: 12, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
