import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import NetChips from '@/components/NetChips';
import { CONTRACT_STATUS } from '@/components/netContractStatus';
import { fmtDate, toList } from '@/components/netFormat';

interface PromoterContract {
  id: string;
  contract_number: string;
  title: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  contract_type: string | null;
  sent_date: string | null;
  signed_date: string | null;
  created_at: string;
}

// Mirrors web dashboard/promoter/contracts (GET /contracts). Creating contracts stays on web.
export default function PromoterContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<PromoterContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setContracts(toList<PromoterContract>(await apiRequest<any>('/contracts'), 'contracts'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load contracts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (status && c.status !== status) return false;
      if (!q) return true;
      return [c.title, c.client_name, c.client_email, c.contract_number].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [contracts, search, status]);

  if (loading) return <LoadingState message="Loading contracts..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load contracts" message={error} />
        <View style={styles.retry}><AppButton title="Try Again" variant="outline" onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search title, client or number" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
      </View>
      <NetChips
        value={status}
        onChange={setStatus}
        activeColor={Colors.purple}
        options={[{ value: '', label: 'All' }, ...['draft', 'sent', 'signed', 'cancelled'].map((s) => ({ value: s, label: CONTRACT_STATUS[s].label }))]}
      />
      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.purple} />}
        ListEmptyComponent={<EmptyState icon="document-text-outline" title={contracts.length ? 'No matches' : 'No contracts yet'} message={contracts.length ? 'Try a different search or filter.' : 'Contracts you create on the web will appear here.'} />}
        renderItem={({ item }) => {
          const st = CONTRACT_STATUS[item.status] || CONTRACT_STATUS.draft;
          return (
            <TouchableOpacity style={[styles.card, Shadow.sm]} activeOpacity={0.8} onPress={() => router.push(`/(promoter)/contracts/${item.id}` as any)}>
              <View style={styles.top}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text></View>
              </View>
              <Text style={styles.sub}>{item.contract_number}{item.client_name ? ` · ${item.client_name}` : ''}</Text>
              <Text style={styles.sub}>
                {item.signed_date ? `Signed ${fmtDate(item.signed_date)}` : item.sent_date ? `Sent ${fmtDate(item.sent_date)}` : `Created ${fmtDate(item.created_at)}`}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  retry: { paddingHorizontal: 32, marginTop: -20 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, margin: 16, marginBottom: 0,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  sub: { fontSize: 12, color: Colors.textSecondary },
});
