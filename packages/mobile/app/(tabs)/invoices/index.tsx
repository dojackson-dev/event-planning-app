import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';

interface Invoice {
  id: string;
  invoice_number?: string;
  status: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  created_at: string;
  client_name?: string;
  intake_form_id?: string;
  intake_form?: { contact_name?: string } | null;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  sent:      { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  viewed:    { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
  paid:      { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  overdue:   { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  partial:   { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount, amount_due, amount_paid, created_at, client_name, intake_form_id, intake_form:intake_forms(contact_name)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvoices((data as unknown as Invoice[]) || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchInvoices(); };

  const filtered = invoices.filter(inv => {
    if (filter === 'unpaid') return ['sent', 'viewed', 'overdue', 'partial'].includes(inv.status);
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const totalOutstanding = invoices
    .filter(i => ['sent', 'viewed', 'overdue', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.amount_due || 0), 0);

  const getClientName = (inv: Invoice) =>
    inv.client_name || inv.intake_form?.contact_name || 'Unknown Client';

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {totalOutstanding > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding Balance</Text>
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
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/invoices/new' as any)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const ss = statusColors[item.status] || statusColors.draft;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/invoices/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.invoiceNum}>{item.invoice_number || `INV-${item.id.slice(-6).toUpperCase()}`}</Text>
                  <Text style={styles.clientName} numberOfLines={1}>{getClientName(item)}</Text>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>{fmt(item.total_amount)}</Text>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                    <Text style={[styles.badgeText, { color: ss.text }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 4 }} />
                </View>
              </View>
              {['partial', 'paid'].includes(item.status) && item.total_amount > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, ((item.amount_paid || 0) / item.total_amount) * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.progressText}>{fmt(item.amount_paid)} of {fmt(item.total_amount)} paid</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No invoices</Text>
            <Text style={styles.emptyText}>Tap New to create your first invoice</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/invoices/new' as any)}>
              <Text style={styles.emptyBtnText}>Create Invoice</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#FFF' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
  },
  newBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  invoiceNum: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  clientName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  amount: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  progressContainer: { marginTop: 10 },
  progressBg: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 2 },
  progressText: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
