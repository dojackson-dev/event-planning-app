import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  asArray, fmtDate, parseDate, errMsg, finStyles as f,
  StatusBadge, ErrorState, ErrorBanner, SearchBar, FilterChips,
} from '@/components/FinUI';

interface Contract {
  id: string;
  contract_number?: string;
  title?: string;
  status: string;
  client_name?: string;
  created_at?: string;
  updated_at?: string;
  sent_date?: string;
  viewed_at?: string | null;
  signed_date?: string;
  owner_signature_data?: string | null;
  owner_signer_name?: string | null;
  contract_type?: string;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'signed', label: 'Signed' },
  { key: 'voided', label: 'Voided' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Same rule as the web list: cancelled contracts older than 7 days only show under the Cancelled filter.
const recentlyCancelled = (c: Contract) => {
  const d = parseDate(c.updated_at || c.created_at);
  return !d || (Date.now() - d.getTime()) / 86400000 <= 7;
};

export default function ContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchContracts = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/contracts');
      setContracts(asArray<Contract>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load contracts'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchContracts(); }, [fetchContracts]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts
      .filter(c => (c.status === 'cancelled' && filter !== 'cancelled' ? recentlyCancelled(c) : filter === 'all' || c.status === filter))
      .filter(c => !q || (c.title || '').toLowerCase().includes(q) || (c.contract_number || '').toLowerCase().includes(q) || (c.client_name || '').toLowerCase().includes(q));
  }, [contracts, filter, search]);

  if (loading) return <LoadingState message="Loading contracts..." />;
  if (error && contracts.length === 0) return <ErrorState message={error} onRetry={fetchContracts} />;

  return (
    <View style={f.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search title, number or client" />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <View style={f.headerRow}>
        <Text style={f.headerTitle}>{filtered.length} {filtered.length === 1 ? 'contract' : 'contracts'}</Text>
        <TouchableOpacity style={f.newBtn} onPress={() => router.push('/(tabs)/contracts/new' as any)}>
          <Ionicons name="add" size={18} color={Colors.textWhite} />
          <Text style={f.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      {!!error && <ErrorBanner message={error} onRetry={fetchContracts} />}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={f.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); fetchContracts(); }} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title={contracts.length === 0 ? 'No contracts yet' : 'No contracts match'}
            message={contracts.length === 0
              ? 'Create a venue booking agreement for one of your events.'
              : 'Try a different search or status filter.'}
          />
        }
        renderItem={({ item }) => {
          const needsCounter = item.status === 'signed' && !item.owner_signature_data;
          return (
            <TouchableOpacity
              style={f.card}
              onPress={() => router.push(`/(tabs)/contracts/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={f.cardRow}>
                <View style={f.cardLeft}>
                  <Text style={f.cardNum}>{item.contract_number || 'Contract'}</Text>
                  <Text style={f.cardTitle} numberOfLines={1}>{item.title || 'Untitled contract'}</Text>
                  {!!item.client_name && <Text style={f.cardMeta} numberOfLines={1}>{item.client_name}</Text>}
                  <Text style={f.cardMeta}>
                    {item.signed_date ? `Signed ${fmtDate(item.signed_date)}` : item.sent_date ? `Sent ${fmtDate(item.sent_date)}` : `Created ${fmtDate(item.created_at)}`}
                  </Text>
                </View>
                <View style={f.cardRight}>
                  <StatusBadge status={item.status} />
                  {!!item.viewed_at && item.status === 'sent' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                      <Ionicons name="eye-outline" size={12} color={Colors.successText} />
                      <Text style={[f.cardMeta, { marginTop: 0, color: Colors.successText }]}>Viewed</Text>
                    </View>
                  )}
                  {needsCounter && (
                    <Text style={[f.cardMeta, { color: Colors.warningText, fontWeight: '600' }]}>Needs counter-sign</Text>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 6 }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
