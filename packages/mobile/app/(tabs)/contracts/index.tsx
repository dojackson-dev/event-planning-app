import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';

interface Contract {
  id: string;
  contract_number?: string;
  title?: string;
  status: 'draft' | 'sent' | 'signed' | 'voided';
  client_name?: string;
  created_at?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft:  { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  sent:   { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  signed: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  voided: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchContracts = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<Contract[]>('/contracts');
      setContracts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchContracts(); }, [fetchContracts]));

  if (loading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={contracts.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchContracts(); }} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title={error ? 'Something went wrong' : 'No contracts yet'}
            message={error || 'Contracts you send to clients will show up here.'}
          />
        }
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
          return (
            <TouchableOpacity
              style={[styles.card, Shadow.sm]}
              onPress={() => router.push(`/(tabs)/contracts/${item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title || item.contract_number || 'Contract'}</Text>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <View style={[styles.dot, { backgroundColor: sc.dot }]} />
                  <Text style={[styles.badgeText, { color: sc.text }]}>{statusLabel(item.status)}</Text>
                </View>
              </View>
              {!!item.client_name && <Text style={styles.subText}>{item.client_name}</Text>}
              <View style={styles.footerRow}>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: Radius.md, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  subText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
});
