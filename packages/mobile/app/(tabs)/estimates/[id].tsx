import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Estimate {
  id: string;
  estimate_number: string;
  status: string;
  client_name: string | null;
  client_phone: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  issue_date: string;
  expiration_date: string;
  notes: string | null;
  terms: string | null;
  intake_form?: { event_name?: string; contact_name?: string } | null;
  estimate_items?: EstimateItem[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#3B82F6',
  viewed: '#8B5CF6',
  approved: '#10B981',
  rejected: '#EF4444',
  expired: '#F59E0B',
  converted: '#059669',
};

const formatDate = (iso: string) => {
  if (!iso) return '';
  return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`*, intake_form:intake_forms!intake_form_id(event_name, contact_name), estimate_items(*)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      setEstimate(data as unknown as Estimate);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load estimate');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSend = async () => {
    Alert.alert(
      'Send Estimate',
      `Send this estimate via SMS to ${estimate?.client_phone || 'the client'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send', onPress: async () => {
            setActionLoading('send');
            try {
              await apiRequest(`/estimates/${id}/status`, { method: 'PUT', body: { status: 'sent' } });
              await load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send estimate');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleConvert = async () => {
    Alert.alert(
      'Convert to Invoice',
      'This will create a new invoice based on this estimate. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert', onPress: async () => {
            setActionLoading('convert');
            try {
              const invoice = await apiRequest<{ id: string }>(`/estimates/${id}/convert-to-invoice`, { method: 'POST' });
              Alert.alert('Converted!', 'Invoice has been created.', [
                { text: 'View Invoice', onPress: () => router.replace(`/(tabs)/invoices/${invoice.id}` as any) },
                { text: 'Stay Here' },
              ]);
              await load();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to convert estimate');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    Alert.alert('Delete Estimate', 'This cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setActionLoading('delete');
          try {
            const { error } = await supabase.from('estimates').delete().eq('id', id);
            if (error) throw error;
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete');
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!estimate) {
    return <View style={styles.center}><Text style={styles.errorText}>Estimate not found</Text></View>;
  }

  const st = estimate.status;
  const statusColor = STATUS_COLORS[st] || '#6B7280';
  const isExpired = estimate.expiration_date && new Date(estimate.expiration_date + 'T23:59:59') < new Date();
  const displayName = estimate.client_name || estimate.intake_form?.contact_name || estimate.intake_form?.event_name || 'Client';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.estimateNumber}>{estimate.estimate_number}</Text>
            <Text style={styles.clientName}>{displayName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
          </View>
        </View>
        <Text style={styles.totalAmount}>{fmt(estimate.total_amount)}</Text>
        <View style={styles.dateLine}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.dateText}>Issued {formatDate(estimate.issue_date)}</Text>
          <Text style={[styles.dateText, isExpired && styles.expired]}> · Expires {formatDate(estimate.expiration_date)}{isExpired ? ' (Expired)' : ''}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        {(st === 'draft' || st === 'viewed') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.sendBtn, actionLoading === 'send' && styles.btnLoading]}
            onPress={handleSend}
            disabled={!!actionLoading}
          >
            {actionLoading === 'send' ? <ActivityIndicator size="small" color="#FFF" /> : (
              <><Ionicons name="send-outline" size={16} color="#FFF" /><Text style={styles.actionBtnText}>Send</Text></>
            )}
          </TouchableOpacity>
        )}
        {(['sent', 'viewed', 'approved'].includes(st) && st !== 'converted') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.convertBtn, actionLoading === 'convert' && styles.btnLoading]}
            onPress={handleConvert}
            disabled={!!actionLoading}
          >
            {actionLoading === 'convert' ? <ActivityIndicator size="small" color="#FFF" /> : (
              <><Ionicons name="arrow-forward-circle-outline" size={16} color="#FFF" /><Text style={styles.actionBtnText}>Convert</Text></>
            )}
          </TouchableOpacity>
        )}
        {st !== 'converted' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn, actionLoading === 'delete' && styles.btnLoading]}
            onPress={handleDelete}
            disabled={!!actionLoading}
          >
            {actionLoading === 'delete' ? <ActivityIndicator size="small" color={Colors.error} /> : (
              <><Ionicons name="trash-outline" size={16} color={Colors.error} /><Text style={[styles.actionBtnText, { color: Colors.error }]}>Delete</Text></>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Line items */}
      {estimate.estimate_items && estimate.estimate_items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Line Items</Text>
          <View style={styles.card}>
            {estimate.estimate_items.map((item, i) => (
              <View key={item.id} style={[styles.lineItem, i === (estimate.estimate_items!.length - 1) && styles.lineItemLast]}>
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
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{fmt(estimate.subtotal)}</Text></View>
          {estimate.discount_amount > 0 && (
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount</Text><Text style={[styles.totalValue, { color: Colors.success }]}>-{fmt(estimate.discount_amount)}</Text></View>
          )}
          {estimate.tax_amount > 0 && (
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Tax ({estimate.tax_rate}%)</Text><Text style={styles.totalValue}>{fmt(estimate.tax_amount)}</Text></View>
          )}
          <View style={[styles.totalRow, { borderBottomWidth: 0, marginTop: 4 }]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{fmt(estimate.total_amount)}</Text>
          </View>
        </View>
      </View>

      {estimate.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <View style={styles.card}><Text style={styles.noteText}>{estimate.notes}</Text></View>
        </View>
      )}
      {estimate.terms && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Terms</Text>
          <View style={styles.card}><Text style={styles.noteText}>{estimate.terms}</Text></View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.textMuted },
  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, ...Shadow.md, marginBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  estimateNumber: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  clientName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '700' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#7C3AED', marginBottom: 10 },
  dateLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: Colors.textMuted },
  expired: { color: Colors.error, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, borderRadius: Radius.lg, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  sendBtn: { backgroundColor: '#3B82F6' },
  convertBtn: { backgroundColor: '#059669' },
  deleteBtn: { backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error },
  btnLoading: { opacity: 0.6 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lineItemLast: { borderBottomWidth: 0 },
  lineItemLeft: { flex: 1, paddingRight: 12 },
  lineDesc: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  lineQty: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  lineAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 22, fontWeight: '800', color: '#7C3AED' },
  noteText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
