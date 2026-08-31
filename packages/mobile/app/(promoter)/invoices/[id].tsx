import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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

interface PromoterInvoiceDetail {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  notes?: string | null;
  terms?: string | null;
  promoter_invoice_items: PromoterInvoiceItem[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: Colors.borderLight,  text: Colors.textSecondary },
  sent:      { bg: Colors.infoLight,    text: Colors.infoText },
  viewed:    { bg: Colors.purpleLight,  text: Colors.purpleText },
  paid:      { bg: Colors.successLight, text: Colors.successText },
  overdue:   { bg: Colors.errorLight,   text: Colors.errorText },
  cancelled: { bg: Colors.borderLight,  text: Colors.textMuted },
};

const statusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export default function PromoterInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<PromoterInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest<PromoterInvoiceDetail>(`/promoter-invoices/${id}`);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!invoice) return;
    setSending(true);
    try {
      await apiRequest(`/promoter-invoices/${invoice.id}/send`, { method: 'POST' });
      Alert.alert('Sent', 'Invoice emailed to client.');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Invoice not found'}</Text>
      </View>
    );
  }

  const ss = STATUS_COLORS[invoice.status] || STATUS_COLORS.draft;
  const items = invoice.promoter_invoice_items ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
          <View style={[styles.statusPill, { backgroundColor: ss.bg }]}>
            <Text style={[styles.statusPillText, { color: ss.text }]}>{statusLabel(invoice.status)}</Text>
          </View>
        </View>
        <Text style={styles.clientName}>{invoice.client_name}</Text>
        {!!invoice.client_email && <Text style={styles.clientMeta}>{invoice.client_email}</Text>}
        {!!invoice.client_phone && <Text style={styles.clientMeta}>{invoice.client_phone}</Text>}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Issued {invoice.issue_date}</Text>
          <Text style={styles.dateLabel}>Due {invoice.due_date}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Line Items</Text>
        <View style={styles.card}>
          {items.length ? items.map((it, idx) => (
            <View key={it.id} style={[styles.itemRow, idx === items.length - 1 && styles.itemRowLast]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDesc}>{it.description}</Text>
                <Text style={styles.itemMeta}>{it.quantity} × ${Number(it.unit_price).toFixed(2)}</Text>
              </View>
              <Text style={styles.itemAmount}>${Number(it.amount).toFixed(2)}</Text>
            </View>
          )) : (
            <Text style={styles.itemMeta}>No line items</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Totals</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subtotal</Text>
            <Text style={styles.infoValue}>${Number(invoice.subtotal).toFixed(2)}</Text>
          </View>
          {Number(invoice.tax_rate) > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tax ({invoice.tax_rate}%)</Text>
              <Text style={styles.infoValue}>${Number(invoice.tax_amount).toFixed(2)}</Text>
            </View>
          )}
          {Number(invoice.discount_amount) > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Discount</Text>
              <Text style={styles.infoValue}>-${Number(invoice.discount_amount).toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.infoRow, styles.totalFinalRow]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalLabel}>${Number(invoice.total_amount).toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Paid</Text>
            <Text style={styles.infoValue}>${Number(invoice.amount_paid).toFixed(2)}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Amount Due</Text>
            <Text style={[styles.infoValue, { color: Colors.purple }]}>${Number(invoice.amount_due).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {!!invoice.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.noteText}>{invoice.notes}</Text>
          </View>
        </View>
      )}

      {!!invoice.terms && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Terms</Text>
          <View style={styles.card}>
            <Text style={styles.noteText}>{invoice.terms}</Text>
          </View>
        </View>
      )}

      {invoice.status === 'draft' && (
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
          {sending ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={styles.sendBtnText}>Send to Client</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 16, ...Shadow.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNum: { fontSize: 16, fontWeight: '700', color: Colors.purple },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  clientMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  dateLabel: { fontSize: 12, color: Colors.textMuted },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  itemRowLast: { borderBottomWidth: 0 },
  itemDesc: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  itemMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemAmount: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginLeft: 8 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalFinalRow: { borderBottomWidth: 0, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  noteText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.purple, borderRadius: Radius.lg, paddingVertical: 14, marginTop: 8,
  },
  sendBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
