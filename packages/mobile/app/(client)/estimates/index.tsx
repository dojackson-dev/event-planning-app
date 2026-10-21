import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import {
  CliDocBadge, CliDocError, CliDocChips, ESTIMATE_STATUS, useCliDocLoad,
  pick, money, fmtDate, daysUntil,
} from '@/components/CliDocUI';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
  { key: 'converted', label: 'Converted' },
];

interface EstimateRow {
  id: string;
  status: string;
  number?: string;
  title?: string;
  eventLine?: string;
  total: number | null;
  createdAt?: string;
  expiration?: string;
  itemCount: number;
  expiringSoon: boolean;
}

function normalize(e: any): EstimateRow {
  const status = String(e?.status ?? 'draft');
  const expiration = pick(e, 'expiration_date');
  const days = daysUntil(expiration);
  const items = pick(e, 'items') ?? pick(e, 'line_items');
  const event = e?.event;
  const eventName = event?.name ?? pick(e, 'event_name');
  const eventDate = event?.date ?? pick(e, 'event_date');
  const total = pick(e, 'total_amount');
  return {
    id: String(e.id),
    status,
    number: pick(e, 'estimate_number'),
    title: e?.title,
    eventLine: eventName ? `${eventName}${eventDate ? ` · ${fmtDate(eventDate)}` : ''}` : undefined,
    total: total === undefined || total === null ? null : Number(total),
    createdAt: pick(e, 'created_at'),
    expiration,
    itemCount: Array.isArray(items) ? items.length : 0,
    expiringSoon: (status === 'sent' || status === 'draft') && days !== null && days >= 0 && days <= 7,
  };
}

export default function ClientEstimatesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const { data, loading, refreshing, error, reload, refresh } = useCliDocLoad<EstimateRow[]>(async () => {
    const res = await clientApi<any[]>('/estimates');
    return (Array.isArray(res) ? res : []).map(normalize);
  });

  const filtered = useMemo(
    () => (data ?? []).filter((e) => filter === 'all' || e.status === filter),
    [data, filter],
  );

  if (loading) return <LoadingState message="Loading estimates..." />;
  if (error && !data) return <CliDocError message={error} onRetry={reload} />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <View>
            <CliDocChips options={FILTERS} value={filter} onChange={setFilter} />
            {error && <Text style={styles.banner}>{error}</Text>}
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No estimates found"
            message={filter === 'all' ? 'Estimates from your event coordinator will appear here.' : 'No estimates match this filter.'}
          />
        }
        renderItem={({ item }) => {
          const cfg = ESTIMATE_STATUS[item.status] ?? ESTIMATE_STATUS.draft;
          return (
            <TouchableOpacity
              style={[styles.card, item.expiringSoon && styles.cardWarn]}
              activeOpacity={0.8}
              onPress={() => router.push(`/(client)/estimates/${item.id}` as never)}
            >
              {item.expiringSoon && (
                <View style={styles.warnBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.warningText} />
                  <Text style={styles.warnText}>This estimate expires soon – please review and respond.</Text>
                </View>
              )}
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title ?? `Estimate${item.number ? ` #${item.number}` : ''}`}
                  </Text>
                  {item.title && item.number ? <Text style={styles.muted}>#{item.number}</Text> : null}
                  {item.eventLine ? <Text style={styles.sub}>{item.eventLine}</Text> : null}
                </View>
                {item.total !== null && <Text style={styles.amount}>{money(item.total)}</Text>}
              </View>
              <View style={styles.bottom}>
                <CliDocBadge cfg={cfg} />
                <View style={{ alignItems: 'flex-end' }}>
                  {item.expiration ? (
                    <Text style={[styles.muted, item.expiringSoon && styles.warnDate]}>Expires {fmtDate(item.expiration)}</Text>
                  ) : null}
                  {item.createdAt ? <Text style={styles.muted}>Created {fmtDate(item.createdAt)}</Text> : null}
                </View>
              </View>
              {item.itemCount > 0 && (
                <Text style={styles.muted}>{item.itemCount} line item{item.itemCount !== 1 ? 's' : ''}</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 40, flexGrow: 1 },
  banner: { marginHorizontal: 16, marginBottom: 8, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, fontSize: 13 },
  card: { backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: Radius.lg, gap: 10, ...Shadow.sm },
  cardWarn: { borderWidth: 1, borderColor: Colors.warning },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningLight, padding: 8, borderRadius: Radius.md },
  warnText: { flex: 1, fontSize: 12, color: Colors.warningText },
  warnDate: { color: Colors.warningText, fontWeight: '700' },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  muted: { fontSize: 12, color: Colors.textMuted },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
});
