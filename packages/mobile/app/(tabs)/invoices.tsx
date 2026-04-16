import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';

interface Invoice {
  id: string;
  status: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  created_at: string;
  booking_id?: string;
  intake_form_id?: string;
  booking?: { event?: { name?: string } } | null;
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

export default function InvoicesScreen() {
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
        .select(`
          id, status, total_amount, amount_due, amount_paid, created_at, booking_id, intake_form_id,
          booking:booking(event:event(name)),
          intake_form:intake_forms(contact_name)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as unknown as Invoice[]) || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error.message);
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

  const getClientName = (inv: Invoice) => {
    if (inv.intake_form?.contact_name) return inv.intake_form.contact_name;
    if (inv.booking?.event?.name) return inv.booking.event.name;
    return 'Unknown Client';
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {totalOutstanding > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding Balance</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalOutstanding)}</Text>
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
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const ss = statusColors[item.status] || statusColors.draft;
          const clientName = getClientName(item);
          const invoiceNum = item.id.slice(-6).toUpperCase();
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.invoiceNum}>INV-{invoiceNum}</Text>
                  <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                    <Text style={[styles.badgeText, { color: ss.text }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {['partial', 'paid'].includes(item.status) && item.total_amount > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, ((item.amount_paid || 0) / item.total_amount) * 100)}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {formatCurrency(item.amount_paid)} of {formatCurrency(item.total_amount)} paid
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{filter !== 'all' ? 'No invoices here' : 'No invoices yet'}</Text>
            <Text style={styles.emptyText}>Invoices you create will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  summaryCard: {
    margin: 16, marginBottom: 0, backgroundColor: Colors.primary, borderRadius: Radius.lg,
    padding: 20, alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },

  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, marginRight: 12 },
  invoiceNum: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 3 },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  dateText: { fontSize: 12, color: Colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  progressContainer: { marginTop: 12, gap: 5 },
  progressBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
  progressText: { fontSize: 11, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
