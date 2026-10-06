import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface PromoterInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface PromoterInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  promoter_invoice_items?: PromoterInvoiceItem[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: Colors.borderLight,  text: Colors.textSecondary, dot: Colors.textMuted },
  sent:      { bg: Colors.infoLight,    text: Colors.infoText,      dot: Colors.info },
  viewed:    { bg: Colors.purpleLight,  text: Colors.purpleText,    dot: Colors.purple },
  paid:      { bg: Colors.successLight, text: Colors.successText,   dot: Colors.success },
  overdue:   { bg: Colors.errorLight,   text: Colors.errorText,     dot: Colors.error },
  cancelled: { bg: Colors.borderLight,  text: Colors.textMuted,     dot: Colors.textMuted },
};

const statusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export default function PromoterInvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PromoterInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<PromoterInvoice[]>('/promoter-invoices/mine');
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices. Make sure your promoter account is set up.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

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
        <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{invoices.length} Invoice{invoices.length === 1 ? '' : 's'}</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(promoter)/invoices/new' as any)}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={invoices}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
        renderItem={({ item }) => {
          const ss = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(promoter)/invoices/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
                  <Text style={styles.clientName} numberOfLines={1}>{item.client_name}</Text>
                  <Text style={styles.dateText}>Due {item.due_date}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.amount}>${Number(item.total_amount).toFixed(2)}</Text>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                    <Text style={[styles.badgeText, { color: ss.text }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>Create your first invoice to start getting paid</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(promoter)/invoices/new' as any)}>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: Colors.purple, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full },
  retryText: { color: '#FFF', fontWeight: '600' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
  },
  newBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12,
    ...Shadow.sm,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: 8 },
  cardRight: { alignItems: 'flex-end' },
  invoiceNum: { fontSize: 13, fontWeight: '700', color: Colors.purple, marginBottom: 2 },
  clientName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.purple, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
