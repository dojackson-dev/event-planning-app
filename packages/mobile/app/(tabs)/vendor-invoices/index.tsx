import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface VendorInvoice {
  id: string;
  status: string;
  issue_date?: string;
  due_date?: string;
  client_name?: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  created_at?: string;
  vendor_accounts?: { business_name?: string } | null;
  vendor_bookings?: { event_name?: string; event_date?: string } | null;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  sent:      { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  viewed:    { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
  paid:      { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  overdue:   { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export default function VendorInvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const fetchInvoices = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<VendorInvoice[]>('/vendor-invoices/owner-bookings');
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchInvoices(); }, [fetchInvoices]));

  const onRefresh = () => { setRefreshing(true); fetchInvoices(); };

  const filtered = invoices.filter(inv => {
    if (filter === 'unpaid') return ['sent', 'viewed', 'overdue'].includes(inv.status);
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const totalOutstanding = invoices
    .filter(i => ['sent', 'viewed', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + (i.amount_due || 0), 0);

  const getVendorName = (inv: VendorInvoice) =>
    inv.vendor_accounts?.business_name || inv.client_name || 'Unknown Vendor';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error && invoices.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={fetchInvoices}>
          <Text style={styles.emptyBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {totalOutstanding > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>You Owe</Text>
          <Text style={styles.summaryAmount}>{fmt(totalOutstanding)}</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {(['all', 'unpaid', 'paid'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const ss = statusColors[item.status] || statusColors.draft;
          const eventName = item.vendor_bookings?.event_name;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/vendor-invoices/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.vendorName} numberOfLines={1}>{getVendorName(item)}</Text>
                  {eventName && <Text style={styles.eventName} numberOfLines={1}>{eventName}</Text>}
                  {item.due_date && (
                    <Text style={styles.dueDate}>Due {new Date(item.due_date).toLocaleDateString()}</Text>
                  )}
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                    <Text style={[styles.badgeText, { color: ss.text }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{fmt(item.total_amount)}</Text>
                  {item.status !== 'paid' && item.status !== 'cancelled' && (
                    <Text style={styles.dueAmount}>{fmt(item.amount_due)} due</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No vendor invoices</Text>
            <Text style={styles.emptyText}>Invoices vendors send you for booked services will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },

  summaryCard: {
    margin: 16, marginBottom: 0, backgroundColor: Colors.primary,
    borderRadius: Radius.lg, padding: 20, alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#FFF' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12,
    ...Shadow.sm,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  vendorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  dueDate: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
  dueAmount: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
