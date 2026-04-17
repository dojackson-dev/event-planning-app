import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface InvoiceDetail {
  id: string;
  invoice_number?: string;
  status: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  issue_date: string;
  due_date: string;
  notes?: string;
  terms?: string;
  client_name?: string;
  client_phone?: string;
  intake_form_id?: string;
  intake_form?: { contact_name?: string; contact_phone?: string } | null;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280' },
  sent:      { bg: '#DBEAFE', text: '#1E40AF' },
  viewed:    { bg: '#EDE9FE', text: '#5B21B6' },
  paid:      { bg: '#D1FAE5', text: '#065F46' },
  overdue:   { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  partial:   { bg: '#FEF3C7', text: '#92400E' },
};

const fmt = (n?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const formatDate = (s?: string) => {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: inv }, { data: items }] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, intake_form:intake_forms(contact_name, contact_phone)')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single(),
        supabase
          .from('invoice_items')
          .select('id, description, quantity, unit_price, amount')
          .eq('invoice_id', id)
          .order('created_at'),
      ]);
      if (inv) setInvoice({ ...(inv as unknown as InvoiceDetail), items: (items || []) as InvoiceItem[] });
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendInvoice = () => {
    const name = invoice?.client_name || invoice?.intake_form?.contact_name || 'the client';
    const phone = invoice?.client_phone || invoice?.intake_form?.contact_phone;
    Alert.alert(
      'Send Invoice',
      `This will mark the invoice as sent${phone ? ` and send an SMS to ${name}` : ` (no phone on file for ${name})`}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send', onPress: async () => {
            setActioning(true);
            try {
              await apiRequest(`/invoices/${id}/status`, { method: 'PUT', body: { status: 'sent' } });
              await load();
              Alert.alert('Sent', 'Invoice marked as sent.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActioning(false);
            }
          },
        },
      ]
    );
  };

  const markPaid = () => {
    Alert.alert('Mark as Paid', 'Mark this invoice as fully paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid', onPress: async () => {
          setActioning(true);
          try {
            await apiRequest(`/invoices/${id}/status`, { method: 'PUT', body: { status: 'paid' } });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setActioning(false);
          }
        },
      },
    ]);
  };

  const deleteInvoice = () => {
    Alert.alert('Delete Invoice', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setActioning(true);
          try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('invoices').delete().eq('id', id);
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message);
            setActioning(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <View style={styles.centered}><Text style={styles.errorText}>Invoice not found</Text></View>
      </>
    );
  }

  const sm = statusColors[invoice.status] || statusColors.draft;
  const clientName = invoice.client_name || invoice.intake_form?.contact_name;
  const invNum = invoice.invoice_number || `INV-${invoice.id.slice(-6).toUpperCase()}`;

  return (
    <>
      <Stack.Screen options={{ title: invNum }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.invNum}>{invNum}</Text>
              {clientName && <Text style={styles.clientName}>{clientName}</Text>}
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

        {/* Actions */}
        <View style={styles.actionRow}>
          {['draft', 'viewed'].includes(invoice.status) && (
            <TouchableOpacity style={styles.actionBtn} onPress={sendInvoice} disabled={actioning}>
              {actioning ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <>
                  <Ionicons name="send-outline" size={16} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Send Invoice</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {['sent', 'viewed', 'partial', 'overdue'].includes(invoice.status) && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={markPaid} disabled={actioning}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>Mark Paid</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={deleteInvoice} disabled={actioning}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dates</Text>
          <View style={styles.card}>
            <InfoRow label="Issue Date" value={formatDate(invoice.issue_date)} />
            <InfoRow label="Due Date" value={formatDate(invoice.due_date)} />
          </View>
        </View>

        {/* Line items */}
        {invoice.items && invoice.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Line Items</Text>
            <View style={styles.card}>
              {invoice.items.map((item, idx) => (
                <View key={item.id} style={[styles.lineRow, idx < invoice.items!.length - 1 && styles.lineBorder]}>
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
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.card}><Text style={styles.notesText}>{invoice.notes}</Text></View>
          </View>
        )}
        {invoice.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Terms</Text>
            <View style={styles.card}><Text style={styles.notesText}>{invoice.terms}</Text></View>
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
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { fontSize: 13, fontWeight: '700' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  paidRow: { marginTop: 12 },
  progressBg: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
  paidText: { fontSize: 13, color: Colors.textMuted },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 12,
  },
  actionBtnGreen: { backgroundColor: Colors.successLight },
  actionBtnRed: { backgroundColor: '#FEE2E2' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalFinalRow: { borderBottomWidth: 0, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  lineRow: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lineDesc: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  lineMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lineAmt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
