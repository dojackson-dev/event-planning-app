import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  asArray, num, fmtMoney, fmtDate, parseDate, errMsg, finStyles as f,
  StatusBadge, ErrorState, ErrorBanner, SearchBar, FilterChips,
} from '@/components/FinUI';

interface Estimate {
  id: string;
  estimate_number?: string;
  status: string;
  total_amount?: number;
  issue_date?: string;
  expiration_date?: string;
  viewed_at?: string | null;
  client_name?: string;
  booking?: { contact_name?: string } | null;
  intake_form?: { contact_name?: string } | null;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
  { key: 'converted', label: 'Converted' },
];

const clientNameOf = (e: Estimate) =>
  e.client_name || e.booking?.contact_name || e.intake_form?.contact_name || 'N/A';

const expiringSoon = (e: Estimate) => {
  if (!['sent', 'draft'].includes(e.status)) return false;
  const d = parseDate(e.expiration_date);
  if (!d) return false;
  const days = (d.getTime() - Date.now()) / 86400000;
  return days >= 0 && days <= 7;
};

export default function EstimatesScreen() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchEstimates = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/estimates');
      setEstimates(asArray<Estimate>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load estimates'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchEstimates(); }, [fetchEstimates]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return estimates
      .filter(e => filter === 'all' || e.status === filter)
      .filter(e => !q || (e.estimate_number || '').toLowerCase().includes(q) || clientNameOf(e).toLowerCase().includes(q));
  }, [estimates, filter, search]);

  const confirmDelete = (e: Estimate) => {
    Alert.alert('Delete Estimate', `Delete ${e.estimate_number || 'this estimate'}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/estimates/${e.id}`, { method: 'DELETE' });
            setEstimates(prev => prev.filter(x => x.id !== e.id));
          } catch (err: any) {
            Alert.alert('Error', errMsg(err, 'Failed to delete estimate'));
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Loading estimates..." />;
  if (error && estimates.length === 0) return <ErrorState message={error} onRetry={fetchEstimates} />;

  return (
    <View style={f.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search estimate # or client" />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <View style={f.headerRow}>
        <Text style={f.headerTitle}>{filtered.length} {filtered.length === 1 ? 'estimate' : 'estimates'}</Text>
        <TouchableOpacity style={f.newBtn} onPress={() => router.push('/(tabs)/estimates/new' as any)}>
          <Ionicons name="add" size={18} color={Colors.textWhite} />
          <Text style={f.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      {!!error && <ErrorBanner message={error} onRetry={fetchEstimates} />}

      <FlatList
        contentContainerStyle={f.list}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); fetchEstimates(); }} />
        }
        renderItem={({ item }) => {
          const soon = expiringSoon(item);
          return (
            <TouchableOpacity
              style={f.card}
              onPress={() => router.push(`/(tabs)/estimates/${item.id}` as any)}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.75}
            >
              <View style={f.cardRow}>
                <View style={f.cardLeft}>
                  <Text style={f.cardNum}>{item.estimate_number || `EST-${item.id.slice(-6).toUpperCase()}`}</Text>
                  <Text style={f.cardTitle} numberOfLines={1}>{clientNameOf(item)}</Text>
                  <Text style={[f.cardMeta, soon && { color: Colors.warningText, fontWeight: '600' }]}>
                    Expires {fmtDate(item.expiration_date)}{soon ? ' · soon' : ''}
                  </Text>
                </View>
                <View style={f.cardRight}>
                  <Text style={f.cardAmount}>{fmtMoney(num(item.total_amount), 0)}</Text>
                  <StatusBadge status={item.status} />
                  {!!item.viewed_at && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                      <Ionicons name="eye-outline" size={12} color={Colors.successText} />
                      <Text style={[f.cardMeta, { marginTop: 0, color: Colors.successText }]}>Viewed</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title={estimates.length === 0 ? 'No estimates yet' : 'No estimates match'}
            message={estimates.length === 0 ? 'Tap New to create your first estimate.' : 'Try a different search or status filter.'}
          />
        }
        ListFooterComponent={filtered.length > 0 ? <Text style={[f.cardMeta, { textAlign: 'center', marginTop: 4 }]}>Long-press an estimate to delete it</Text> : null}
      />
    </View>
  );
}
