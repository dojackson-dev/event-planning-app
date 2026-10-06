import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface VendorInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface VendorInvoiceDetail {
  id: string;
  status: string;
  issue_date?: string;
  due_date?: string;
  client_name?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  notes?: string;
  terms?: string;
  vendor_invoice_items?: VendorInvoiceItem[];
  vendor_accounts?: { business_name?: string; email?: string; phone?: string; city?: string; state?: string } | null;
  vendor_bookings?: { event_name?: string; event_date?: string; status?: string } | null;
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

export default function VendorInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<VendorInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest<VendorInvoiceDetail>(`/vendor-invoices/owner/${id}`);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error || !invoice) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Invoice not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const sm = statusColors[invoice.status] || statusColors.draft;
  const vendorName = invoice.vendor_accounts?.business_name || invoice.client_name || 'Vendor';
  const eventName = invoice.vendor_bookings?.event_name;

  return (
    <>
      <Stack.Screen options={{ title: vendorName }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.vendorName}>{vendorName}</Text>
              {eventName && <Text style={styles.eventName}>{eventName}</Text>}
            </View>
            <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[styles.statusText, { color: sm.text }]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>{fmt(invoice.total_amount)}</Text>
          {invoice.amount_paid > 0 && invoice.status !== 'paid' && (
            <View style={styles.paidRow}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (invoice.amount_paid / invoice.total_amount) * 100)}%` as any }]} />
              </View>
              <Text style={styles.paidText}>{fmt(invoice.amount_paid)} paid · {fmt(invoice.amount_due)} due</Text>
            </View>
          )}
        </View>

        {/* Vendor info */}
        {invoice.vendor_accounts && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vendor</Text>
            <View style={styles.card}>
              {invoice.vendor_accounts.email && <InfoRow label="Email" value={invoice.vendor_accounts.email} />}
              {invoice.vendor_accounts.phone && <InfoRow label="Phone" value={invoice.vendor_accounts.phone} />}
              {(invoice.vendor_accounts.city || invoice.vendor_accounts.state) && (
                <InfoRow
                  label="Location"
                  value={[invoice.vendor_accounts.city, invoice.vendor_accounts.state].filter(Boolean).join(', ')}
                />
              )}
            </View>
          </View>
        )}

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.card}>
            {invoice.issue_date && <InfoRow label="Issued" value={new Date(invoice.issue_date).toLocaleDateString()} />}
            {invoice.due_date && <InfoRow label="Due" value={new Date(invoice.due_date).toLocaleDateString()} />}
            {invoice.vendor_bookings?.event_date && (
              <InfoRow label="Event Date" value={new Date(invoice.vendor_bookings.event_date).toLocaleDateString()} />
            )}
          </View>
        </View>

        {/* Line items */}
        {invoice.vendor_invoice_items && invoice.vendor_invoice_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Line Items</Text>
            <View style={styles.card}>
              {invoice.vendor_invoice_items.map((item, idx) => (
                <View
                  key={item.id}
                  style={[styles.lineItem, idx === invoice.vendor_invoice_items!.length - 1 && styles.lineItemLast]}
                >
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineDesc}>{item.description}</Text>
                    <Text style={styles.lineQty}>{item.quantity} × {fmt(item.unit_price)}</Text>
                  </View>
                  <Text style={styles.lineAmount}>{fmt(item.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Totals</Text>
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(invoice.subtotal)}</Text>
            </View>
            {invoice.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>-{fmt(invoice.discount_amount)}</Text>
              </View>
            )}
            {invoice.tax_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({invoice.tax_rate}%)</Text>
                <Text style={styles.totalValue}>{fmt(invoice.tax_amount)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalFinalRow]}>
              <Text style={styles.totalFinalLabel}>Total</Text>
              <Text style={styles.totalFinalValue}>{fmt(invoice.total_amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid</Text>
              <Text style={styles.totalValue}>{fmt(invoice.amount_paid)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalFinalRow]}>
              <Text style={styles.totalFinalLabel}>Amount Due</Text>
              <Text style={styles.totalFinalValue}>{fmt(invoice.amount_due)}</Text>
            </View>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.card}>
              <Text style={styles.noteText}>{invoice.notes}</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { color: Colors.textMuted, fontSize: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryBtnText: { color: '#FFF', fontWeight: '600' },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, ...Shadow.md, marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  vendorName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { fontSize: 13, fontWeight: '700' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  paidRow: { marginTop: 12 },
  progressBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.success, borderRadius: 3 },
  paidText: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lineItemLast: { borderBottomWidth: 0 },
  lineItemLeft: { flex: 1, paddingRight: 12 },
  lineDesc: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  lineQty: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  lineAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalFinalRow: { borderBottomWidth: 0, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  noteText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
