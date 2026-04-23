import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';

interface Estimate {
  id: string;
  estimate_number?: string;
  status: string;
  total_amount: number;
  issue_date: string;
  expiration_date: string;
  client_name?: string;
  intake_form_id?: string;
  intake_form?: { contact_name?: string } | null;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  sent:      { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  approved:  { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  expired:   { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  converted: { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

export default function EstimatesScreen() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'converted'>('all');

  useEffect(() => { fetchEstimates(); }, []);

  const fetchEstimates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('estimates')
        .select('id, estimate_number, status, total_amount, issue_date, expiration_date, client_name, intake_form_id, intake_form:intake_forms(contact_name)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEstimates((data as unknown as Estimate[]) || []);
    } catch (err: any) {
      console.error('Error fetching estimates:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchEstimates(); };

  const filtered = estimates.filter(e => {
    if (filter === 'active') return ['draft', 'sent', 'approved'].includes(e.status);
    if (filter === 'converted') return e.status === 'converted';
    return true;
  });

  const getClientName = (e: Estimate) =>
    e.client_name || e.intake_form?.contact_name || 'Unknown Client';

  const isExpiringSoon = (e: Estimate) => {
    if (!['sent', 'draft'].includes(e.status)) return false;
    const exp = new Date(e.expiration_date + 'T00:00:00');
    return (exp.getTime() - Date.now()) < 3 * 86400000 && exp.getTime() > Date.now();
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {(['all', 'active', 'converted'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/estimates/new' as any)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const ss = statusColors[item.status] || statusColors.draft;
          const expiring = isExpiringSoon(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/estimates/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.stripe, { backgroundColor: ss.dot }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.estNum}>{item.estimate_number || `EST-${item.id.slice(-6).toUpperCase()}`}</Text>
                    <Text style={styles.clientName} numberOfLines={1}>{getClientName(item)}</Text>
                    <Text style={styles.dateText}>
                      {expiring && <Text style={styles.expiring}>⚠ Expires soon  </Text>}
                      Expires {new Date(item.expiration_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>{fmt(item.total_amount)}</Text>
                    <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                      <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                      <Text style={[styles.badgeText, { color: ss.text }]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No estimates</Text>
            <Text style={styles.emptyText}>Tap New to create your first estimate</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/estimates/new' as any)}>
              <Text style={styles.emptyBtnText}>Create Estimate</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#FFF' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
  },
  newBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  stripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  estNum: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginBottom: 2 },
  clientName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  expiring: { color: '#F59E0B', fontWeight: '600' },
  amount: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
