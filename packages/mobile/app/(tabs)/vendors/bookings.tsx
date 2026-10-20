import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import NetChips from '@/components/NetChips';
import { fmtDate, fmtMoney, fmtTime } from '@/components/netFormat';

// Shape returned by GET /vendors/bookings/owner (vendor_bookings row + joined
// vendor_accounts relation), per frontend `Booking`/`EventVendorBooking`
// consumer interfaces (packages/frontend/src/lib/vendorTypes.ts and
// dashboard/events/[id]/manage/page.tsx).
interface VendorBooking {
  id: string;
  vendor_account_id: string;
  event_name?: string;
  event_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  status: string;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  agreed_amount?: number;
  deposit_amount?: number;
  notes?: string;
  vendor_accounts?: { business_name?: string; category?: string; profile_image_url?: string } | null;
}

// Confirmed enum from packages/backend/migrations/add-vendors.sql
// vendor_bookings.status CHECK constraint.
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.warningLight, text: Colors.warningText },
  confirmed: { bg: Colors.successLight, text: Colors.successText },
  declined: { bg: Colors.errorLight, text: Colors.errorText },
  cancelled: { bg: Colors.borderLight, text: Colors.textSecondary },
  completed: { bg: Colors.infoLight, text: Colors.infoText },
};

const FILTERS = ['', 'pending', 'confirmed', 'completed', 'declined', 'cancelled'];

export default function VendorBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

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

  // Upcoming first (soonest), then past (most recent first) — same ordering as web.
  const today = new Date().toISOString().slice(0, 10);
  const q = search.trim().toLowerCase();
  const visible = bookings
    .filter((b) => (!filter || b.status === filter)
      && (!q || (b.vendor_accounts?.business_name || '').toLowerCase().includes(q) || (b.event_name || '').toLowerCase().includes(q)))
    .sort((a, b) => {
      const da = (a.event_date || '').slice(0, 10);
      const db = (b.event_date || '').slice(0, 10);
      const af = da >= today;
      const bf = db >= today;
      if (af && bf) return da.localeCompare(db);
      if (!af && !bf) return db.localeCompare(da);
      return af ? -1 : 1;
    });
  const counts = bookings.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.status]: (acc[b.status] || 0) + 1 }), {});

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visible}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search vendor or event"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.chipBleed}>
            <NetChips
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({
                value: f,
                label: f ? `${f.charAt(0).toUpperCase()}${f.slice(1)}${counts[f] ? ` (${counts[f]})` : ''}` : `All (${bookings.length})`,
              }))}
            />
          </View>
        </View>
      }
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
                  <Text style={styles.metaText}>
                    {fmtDate(item.event_date)}
                    {item.start_time ? ` · ${fmtTime(item.start_time)}${item.end_time ? ` – ${fmtTime(item.end_time)}` : ''}` : ''}
                  </Text>
                </View>
              )}
              {!!item.venue_name && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{item.venue_name}</Text>
                </View>
              )}
              {item.agreed_amount != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{fmtMoney(item.agreed_amount)}{item.deposit_amount ? ` (deposit ${fmtMoney(item.deposit_amount)})` : ''}</Text>
                </View>
              )}
            </View>
            {!!item.invoiceStatus && (
              <View style={styles.metaRow2}>
                <Text style={styles.metaText}>Invoice: {item.invoiceStatus}</Text>
                {item.invoiceStatus !== 'paid' && (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/vendor-invoices' as any)}>
                    <Text style={styles.payLink}>View invoices</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
          <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : bookings.length ? 'No matching bookings' : 'No vendor bookings yet'}</Text>
          <Text style={styles.emptyText}>
            {error || (bookings.length ? 'Try a different status filter or search.' : 'Bookings you request from vendors will appear here.')}
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaRow2: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  payLink: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  headerWrap: { marginBottom: 4 },
  chipBleed: { marginHorizontal: -16 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
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
