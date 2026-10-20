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
  StatusBadge, ErrorState, ErrorBanner, SearchBar, FilterChips, SummaryRow,
} from '@/components/FinUI';

interface Invoice {
  id: string;
  invoice_number?: string;
  status: string;
  total_amount?: number;
  amount_due?: number;
  amount_paid?: number;
  due_date?: string;
  created_at?: string;
  client_name?: string;
  client_email?: string;
  event?: { name?: string; date?: string } | null;
  booking?: { contact_name?: string; contact_email?: string } | null;
  intake_form?: { contact_name?: string; contact_email?: string } | null;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

const OPEN = ['sent', 'viewed', 'partial', 'overdue'];

// Mirrors the web list's getCustomerName fallbacks.
const clientNameOf = (inv: Invoice) =>
  inv.client_name ||
  inv.booking?.contact_name || inv.booking?.contact_email ||
  inv.intake_form?.contact_name || inv.intake_form?.contact_email ||
  inv.client_email || 'N/A';

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/invoices');
      setInvoices(asArray<Invoice>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load invoices'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchInvoices(); }, [fetchInvoices]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter(i => filter === 'all' || i.status === filter)
      .filter(i => !q ||
        (i.invoice_number || '').toLowerCase().includes(q) ||
        clientNameOf(i).toLowerCase().includes(q) ||
        (i.client_email || '').toLowerCase().includes(q));
  }, [invoices, filter, search]);

  const outstanding = invoices.filter(i => OPEN.includes(i.status)).reduce((sum, i) => sum + num(i.amount_due), 0);
  const collected = invoices.reduce((sum, i) => sum + (i.status === 'paid' ? num(i.total_amount) : num(i.amount_paid)), 0);

  if (loading) return <LoadingState message="Loading invoices..." />;
  if (error && invoices.length === 0) return <ErrorState message={error} onRetry={fetchInvoices} />;

  return (
    <View style={f.container}>
      <SummaryRow
        items={[
          { label: 'Outstanding', value: fmtMoney(outstanding, 0), color: Colors.warningText },
          { label: 'Collected', value: fmtMoney(collected, 0), color: Colors.successText },
        ]}
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search invoice # or client" />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <View style={f.headerRow}>
        <Text style={f.headerTitle}>{filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[f.newBtn, { backgroundColor: Colors.primaryDark }]} onPress={() => router.push('/(tabs)/estimates' as any)}>
            <Ionicons name="document-text-outline" size={16} color={Colors.textWhite} />
            <Text style={f.newBtnText}>From Estimate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={f.newBtn} onPress={() => router.push('/(tabs)/invoices/new' as any)}>
            <Ionicons name="add" size={18} color={Colors.textWhite} />
            <Text style={f.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
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
          const total = num(item.total_amount);
          const paid = num(item.amount_paid);
          const open = OPEN.includes(item.status);
          const late = open && isPastDue(item.due_date);
          return (
            <TouchableOpacity
              style={f.card}
              onPress={() => router.push(`/(tabs)/invoices/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={f.cardRow}>
                <View style={f.cardLeft}>
                  <Text style={f.cardNum}>{item.invoice_number || `INV-${item.id.slice(-6).toUpperCase()}`}</Text>
                  <Text style={f.cardTitle} numberOfLines={1}>{clientNameOf(item)}</Text>
                  {!!item.event?.name && <Text style={f.cardMeta} numberOfLines={1}>{item.event.name}</Text>}
                  <Text style={[f.cardMeta, late && { color: Colors.error, fontWeight: '600' }]}>
                    Due {fmtDate(item.due_date)}{late ? ' · past due' : ''}
                  </Text>
                </View>
                <View style={f.cardRight}>
                  <Text style={f.cardAmount}>{fmtMoney(total, 0)}</Text>
                  <StatusBadge status={item.status} />
                  {open && num(item.amount_due) > 0 && paid > 0 && (
                    <Text style={[f.cardMeta, { marginTop: 6 }]}>{fmtMoney(item.amount_due, 0)} due</Text>
                  )}
                </View>
              </View>
              {['partial', 'paid'].includes(item.status) && total > 0 && (
                <View>
                  <View style={f.progressBg}>
                    <View style={[f.progressFill, { width: `${Math.min(100, (paid / total) * 100)}%` as any }]} />
                  </View>
                  <Text style={f.progressText}>{fmtMoney(paid, 0)} of {fmtMoney(total, 0)} paid</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={invoices.length === 0 ? 'No invoices yet' : 'No invoices match'}
            message={invoices.length === 0 ? 'Tap New to create your first invoice.' : 'Try a different search or status filter.'}
          />
        }
      />
    </View>
  );
}
