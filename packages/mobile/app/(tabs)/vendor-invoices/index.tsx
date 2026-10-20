import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  asArray, num, fmtMoney, fmtDate, isPastDue, errMsg, finStyles as f,
  StatusBadge, ErrorState, ErrorBanner, FilterChips, SummaryRow,
} from '@/components/FinUI';

interface VendorInvoice {
  id: string;
  invoice_number?: string;
  status: string;
  issue_date?: string;
  due_date?: string;
  client_name?: string;
  total_amount?: number;
  amount_due?: number;
  amount_paid?: number;
  vendor_accounts?: { business_name?: string } | null;
  vendor_bookings?: { event_name?: string; event_date?: string } | null;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Payment' },
  { key: 'paid', label: 'Paid' },
];

const isUnpaid = (i: VendorInvoice) => !['paid', 'cancelled'].includes(i.status);

export default function VendorInvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchInvoices = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/vendor-invoices/owner-bookings');
      setInvoices(asArray<VendorInvoice>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load vendor invoices'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchInvoices(); }, [fetchInvoices]));

  const filtered = useMemo(
    () => invoices.filter(i => filter === 'all' || (filter === 'paid' ? i.status === 'paid' : isUnpaid(i))),
    [invoices, filter],
  );

  const unpaid = invoices.filter(isUnpaid);
  const owed = unpaid.reduce((sum, i) => sum + num(i.amount_due), 0);
  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + num(i.total_amount), 0);

  if (loading) return <LoadingState message="Loading vendor invoices..." />;
  if (error && invoices.length === 0) return <ErrorState message={error} onRetry={fetchInvoices} />;

  return (
    <View style={f.container}>
      <SummaryRow
        items={[
          { label: `Amount Owed · ${unpaid.length}`, value: fmtMoney(owed, 0), color: Colors.warningText },
          { label: 'Total Paid', value: fmtMoney(paidTotal, 0), color: Colors.successText },
        ]}
      />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <View style={f.headerRow}>
        <Text style={f.headerTitle}>Invoices from vendors you've booked</Text>
      </View>
      {!!error && <ErrorBanner message={error} onRetry={fetchInvoices} />}

      <FlatList
        contentContainerStyle={f.list}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); fetchInvoices(); }} />
        }
        renderItem={({ item }) => {
          const late = isUnpaid(item) && item.status !== 'processing' && isPastDue(item.due_date);
          const event = item.vendor_bookings?.event_name;
          return (
            <TouchableOpacity
              style={f.card}
              onPress={() => router.push(`/(tabs)/vendor-invoices/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={f.cardRow}>
                <View style={f.cardLeft}>
                  <Text style={f.cardNum}>{item.invoice_number || `INV-${item.id.slice(-6).toUpperCase()}`}</Text>
                  <Text style={f.cardTitle} numberOfLines={1}>
                    {item.vendor_accounts?.business_name || item.client_name || 'Vendor'}
                  </Text>
                  {!!event && (
                    <Text style={f.cardMeta} numberOfLines={1}>
                      {event}{item.vendor_bookings?.event_date ? ` · ${fmtDate(item.vendor_bookings.event_date)}` : ''}
                    </Text>
                  )}
                  <Text style={[f.cardMeta, late && { color: Colors.error, fontWeight: '600' }]}>
                    Due {fmtDate(item.due_date)}{late ? ' · past due' : ''}
                  </Text>
                </View>
                <View style={f.cardRight}>
                  <Text style={f.cardAmount}>{fmtMoney(num(item.total_amount), 0)}</Text>
                  <StatusBadge status={item.status} label={['sent', 'viewed'].includes(item.status) ? 'Awaiting Payment' : undefined} />
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 6 }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title={invoices.length === 0 ? 'No vendor invoices yet' : 'Nothing here'}
            message={invoices.length === 0
              ? 'When you book a vendor with an agreed amount, an invoice will appear here.'
              : 'No invoices match this filter.'}
          />
        }
      />
    </View>
  );
}
