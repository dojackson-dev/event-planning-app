import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface VendorInvoiceSummary {
  id: string;
  status: string;
  total_amount: number;
  amount_paid: number;
}

interface VendorBooking {
  id: string;
  event_name: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  notes?: string | null;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'paid';
  agreed_amount?: number | null;
  deposit_amount?: number | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  vendorInvoices?: VendorInvoiceSummary[];
}

const STATUS_META: Record<string, { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending:   { label: 'Pending',   bg: Colors.warningLight, fg: Colors.warningText, icon: 'time-outline' },
  confirmed: { label: 'Confirmed', bg: Colors.successLight, fg: Colors.successText, icon: 'checkmark-circle-outline' },
  declined:  { label: 'Declined',  bg: Colors.errorLight,   fg: Colors.errorText,   icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', bg: Colors.borderLight,  fg: Colors.textSecondary, icon: 'ban-outline' },
  completed: { label: 'Completed', bg: Colors.infoLight,    fg: Colors.infoText,    icon: 'checkmark-done-circle-outline' },
  paid:      { label: 'Paid',      bg: Colors.purpleLight,  fg: Colors.purpleText,  icon: 'cash-outline' },
};

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'declined', label: 'Declined' },
];

const formatDate = (d?: string | null) => {
  if (!d) return '';
  return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const fmtMoney = (n?: number | null) =>
  n == null ? null : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function VendorBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<VendorBooking[]>('/vendors/bookings/mine');
      const sorted = [...(data || [])].sort((a, b) => {
        const da = a.event_date || '';
        const db = b.event_date || '';
        return da.localeCompare(db);
      });
      setBookings(sorted);
    } catch (err: any) {
      setError(err?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = filter ? bookings.filter((b) => b.status === filter) : bookings;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No bookings found</Text>
          <Text style={styles.emptyText}>
            {filter ? `You have no ${filter} bookings.` : 'Confirmed bookings from venues will show up here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] || STATUS_META.pending;
            const amount = fmtMoney(item.agreed_amount);
            return (
              <TouchableOpacity
                style={[styles.card, Shadow.sm]}
                activeOpacity={0.85}
                onPress={() => router.push(`/(vendor)/bookings/${item.id}` as any)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.eventName} numberOfLines={1}>{item.event_name || 'Untitled Event'}</Text>
                  <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={12} color={meta.fg} />
                    <Text style={[styles.pillText, { color: meta.fg }]}>{meta.label}</Text>
                  </View>
                </View>
                <View style={styles.cardRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.cardMeta}>{formatDate(item.event_date)}</Text>
                  {item.start_time ? <Text style={styles.cardMeta}>· {item.start_time}</Text> : null}
                </View>
                {item.venue_name ? (
                  <View style={styles.cardRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.cardMeta} numberOfLines={1}>{item.venue_name}</Text>
                  </View>
                ) : null}
                <View style={styles.cardBottom}>
                  {item.client_name ? <Text style={styles.clientName} numberOfLines={1}>{item.client_name}</Text> : <View />}
                  {amount ? <Text style={styles.amount}>{amount}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },

  filterRow: { backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  filterList: { paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#FFF' },

  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  eventName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: Colors.textMuted },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  clientName: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
});
