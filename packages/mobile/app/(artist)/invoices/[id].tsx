import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface ArtistInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface ArtistInvoiceDetail {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  notes?: string | null;
  terms?: string | null;
  artist_invoice_items: ArtistInvoiceItem[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280' },
  sent:      { bg: '#DBEAFE', text: '#1E40AF' },
  viewed:    { bg: '#EDE9FE', text: '#5B21B6' },
  paid:      { bg: '#D1FAE5', text: '#065F46' },
  overdue:   { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

export default function ArtistInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<ArtistInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest<ArtistInvoiceDetail>(`/artist-invoices/${id}`);
      setInvoice(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleSend = async () => {
    if (!id) return;
    setSending(true);
    try {
      await apiRequest(`/artist-invoices/${id}/send`, { method: 'POST' });
      Alert.alert('Sent', 'The invoice has been emailed to the client.');
      fetchInvoice();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send invoice.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Invoice not found'}</Text>
        </View>
      </>
    );
  }

  const sm = statusColors[invoice.status] || statusColors.draft;

  return (
    <>
      <Stack.Screen options={{ title: invoice.invoice_number }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invNum}>{invoice.invoice_number}</Text>
              <Text style={styles.clientName}>{invoice.client_name}</Text>
              <Text style={styles.clientSub}>{invoice.client_email}</Text>
              {invoice.client_phone ? <Text style={styles.clientSub}>{invoice.client_phone}</Text> : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[styles.statusText, { color: sm.text }]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>{fmt(invoice.total_amount)}</Text>
          {invoice.status !== 'paid' && Number(invoice.amount_due) > 0 && (
            <Text style={styles.dueText}>{fmt(invoice.amount_due)} due by {invoice.due_date}</Text>
          )}
        </View>

        {/* Send action */}
        {invoice.status === 'draft' && (
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.btnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFF" />
                <Text style={styles.sendBtnText}>Send to Client</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dates</Text>
          <View style={styles.card}>
            <InfoRow label="Issue Date" value={invoice.issue_date} />
            <InfoRow label="Due Date" value={invoice.due_date} />
          </View>
        </View>

        {/* Line items */}
        {invoice.artist_invoice_items?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Line Items</Text>
            <View style={styles.card}>
              {invoice.artist_invoice_items.map(item => (
                <View key={item.id} style={styles.lineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineDesc}>{item.description}</Text>
                    <Text style={styles.lineMeta}>{item.quantity} × {fmt(item.unit_price)}</Text>
                  </View>
                  <Text style={styles.lineAmt}>{fmt(item.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Totals</Text>
          <View style={styles.card}>
            <InfoRow label="Subtotal" value={fmt(invoice.subtotal)} />
            {invoice.discount_amount > 0 && <InfoRow label="Discount" value={`-${fmt(invoice.discount_amount)}`} />}
            {invoice.tax_rate > 0 && <InfoRow label={`Tax (${invoice.tax_rate}%)`} value={fmt(invoice.tax_amount)} />}
            <View style={[styles.infoRow, styles.totalFinalRow]}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>{fmt(invoice.total_amount)}</Text>
            </View>
            {invoice.amount_paid > 0 && <InfoRow label="Paid" value={fmt(invoice.amount_paid)} />}
          </View>
        </View>

        {/* Notes & terms */}
        {(invoice.notes || invoice.terms) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes &amp; Terms</Text>
            <View style={styles.card}>
              {invoice.notes ? <Text style={styles.noteText}>{invoice.notes}</Text> : null}
              {invoice.terms ? <Text style={[styles.noteText, { marginTop: 8 }]}>{invoice.terms}</Text> : null}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 16 },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, ...Shadow.md, marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  invNum: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  clientName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  clientSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { fontSize: 13, fontWeight: '700' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  dueText: { fontSize: 13, color: Colors.warningText, marginTop: 4, fontWeight: '600' },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, marginBottom: 16,
  },
  sendBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalFinalRow: { borderBottomWidth: 0, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lineDesc: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  lineMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lineAmt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  noteText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
