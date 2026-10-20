import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Share, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  asArray, num, fmtMoney, fmtDate, parseDate, errMsg, finStyles as f,
  StatusBadge, ErrorState, ErrorBanner, SummaryRow,
} from '@/components/FinUI';

interface Invoice {
  id: string;
  invoice_number?: string;
  status: string;
  total_amount?: number;
  amount_paid?: number;
  amount_due?: number;
  issue_date?: string;
  client_name?: string;
  client_email?: string;
  booking?: { contact_name?: string; contact_email?: string } | null;
  intake_form?: { contact_name?: string; contact_email?: string } | null;
}

const clientNameOf = (i: Invoice) =>
  i.client_name || i.booking?.contact_name || i.intake_form?.contact_name || i.client_email || 'N/A';

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export default function PaymentsScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/invoices');
      setInvoices(asArray<Invoice>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load payments'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPayments(); }, [fetchPayments]));

  // Same figures as the web Payments page.
  const stats = useMemo(() => {
    const now = new Date();
    return invoices.reduce((acc, inv) => {
      const paid = num(inv.amount_paid);
      const due = num(inv.amount_due);
      acc.received += inv.status === 'paid' ? num(inv.total_amount) : paid;
      if (inv.status === 'sent' || inv.status === 'draft') acc.pending += due;
      if (inv.status === 'overdue') acc.overdue += due;
      const issued = parseDate(inv.issue_date);
      if (issued && issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear()) acc.thisMonth += paid;
      return acc;
    }, { received: 0, pending: 0, overdue: 0, thisMonth: 0 });
  }, [invoices]);

  const withPayments = useMemo(
    () => invoices
      .filter(i => num(i.amount_paid) > 0)
      .sort((a, b) => (parseDate(b.issue_date)?.getTime() || 0) - (parseDate(a.issue_date)?.getTime() || 0)),
    [invoices],
  );

  const exportCsv = async () => {
    const header = ['Invoice Number', 'Customer', 'Issue Date', 'Total Amount', 'Amount Paid', 'Amount Due', 'Status'];
    const rows = invoices.map(i => [
      i.invoice_number || '', clientNameOf(i), fmtDate(i.issue_date),
      num(i.total_amount).toFixed(2), num(i.amount_paid).toFixed(2), num(i.amount_due).toFixed(2), i.status,
    ]);
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
    try {
      await Share.share({ title: 'payments-export.csv', message: csv });
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, 'Could not share the report'));
    }
  };

  if (loading) return <LoadingState message="Loading payments..." />;
  if (error && invoices.length === 0) return <ErrorState message={error} onRetry={fetchPayments} />;

  return (
    <View style={f.container}>
      {!!error && <ErrorBanner message={error} onRetry={fetchPayments} />}
      <FlatList
        contentContainerStyle={f.list}
        data={withPayments}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); fetchPayments(); }} />
        }
        ListHeaderComponent={
          <View style={{ marginHorizontal: -16 }}>
            <SummaryRow items={[
              { label: 'Received', value: fmtMoney(stats.received, 0), color: Colors.successText },
              { label: 'Pending', value: fmtMoney(stats.pending, 0), color: Colors.infoText },
            ]} />
            <SummaryRow items={[
              { label: 'Overdue', value: fmtMoney(stats.overdue, 0), color: Colors.errorText },
              { label: 'This month', value: fmtMoney(stats.thisMonth, 0), color: Colors.purpleText },
            ]} />
            <View style={[f.headerRow, { paddingTop: 16 }]}>
              <Text style={f.headerTitle}>Recent payments</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[f.newBtn, { backgroundColor: Colors.primaryDark }]} onPress={() => router.push('/(tabs)/invoices' as any)}>
                  <Ionicons name="receipt-outline" size={15} color={Colors.textWhite} />
                  <Text style={f.newBtnText}>Invoices</Text>
                </TouchableOpacity>
                <TouchableOpacity style={f.newBtn} onPress={exportCsv}>
                  <Ionicons name="share-outline" size={15} color={Colors.textWhite} />
                  <Text style={f.newBtnText}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={f.card}
            onPress={() => router.push(`/(tabs)/invoices/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={f.cardRow}>
              <View style={f.cardLeft}>
                <Text style={f.cardNum}>{item.invoice_number || `INV-${item.id.slice(-6).toUpperCase()}`}</Text>
                <Text style={f.cardTitle} numberOfLines={1}>{clientNameOf(item)}</Text>
                <Text style={f.cardMeta}>Issued {fmtDate(item.issue_date)} · Total {fmtMoney(item.total_amount)}</Text>
              </View>
              <View style={f.cardRight}>
                <Text style={[f.cardAmount, { color: Colors.successText }]}>{fmtMoney(item.amount_paid)}</Text>
                <StatusBadge status={item.status} />
                {num(item.amount_due) > 0 && item.status !== 'paid' && (
                  <Text style={[f.cardMeta, { color: Colors.error }]}>{fmtMoney(item.amount_due)} due</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState icon="cash-outline" title="No payments recorded yet" message="Payments appear here once a client pays an invoice or you record one." />
        }
      />
    </View>
  );
}
