import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import {
  CliDocBadge, CliDocError, CliDocChips, CONTRACT_STATUS, useCliDocLoad, pick, fmtDate,
} from '@/components/CliDocUI';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Awaiting Signature' },
  { key: 'signed', label: 'Signed' },
  { key: 'draft', label: 'Draft' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'voided', label: 'Waived' },
];

interface ContractRow {
  id: string;
  status: string;
  number?: string;
  title?: string;
  description?: string;
  eventLine?: string;
  createdAt?: string;
  signedAt?: string;
  sentAt?: string;
  hasFile: boolean;
}

function normalize(c: any): ContractRow {
  const eventName = c?.event?.name ?? pick(c, 'event_name');
  const eventDate = c?.event?.date ?? pick(c, 'event_date');
  return {
    id: String(c.id),
    status: String(c?.status ?? 'draft'),
    number: pick(c, 'contract_number'),
    title: c?.title,
    description: c?.description,
    eventLine: eventName ? `${eventName}${eventDate ? ` · ${fmtDate(eventDate)}` : ''}` : undefined,
    createdAt: pick(c, 'created_at'),
    signedAt: pick(c, 'signed_date') ?? pick(c, 'signed_at'),
    sentAt: pick(c, 'sent_date') ?? pick(c, 'sent_at'),
    hasFile: !!pick(c, 'file_url'),
  };
}

export default function ClientContractsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const { data, loading, refreshing, error, reload, refresh } = useCliDocLoad<ContractRow[]>(async () => {
    const res = await clientApi<any[]>('/contracts');
    return (Array.isArray(res) ? res : []).map(normalize);
  });

  const filtered = useMemo(
    () => (data ?? []).filter((c) => filter === 'all' || c.status === filter),
    [data, filter],
  );

  if (loading) return <LoadingState message="Loading contracts..." />;
  if (error && !data) return <CliDocError message={error} onRetry={reload} />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
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
            title="No contracts found"
            message={filter === 'all' ? 'Contracts from your event coordinator will appear here.' : 'No contracts match this filter.'}
          />
        }
        renderItem={({ item }) => {
          const cfg = CONTRACT_STATUS[item.status] ?? CONTRACT_STATUS.draft;
          const needsSignature = item.status === 'sent';
          return (
            <TouchableOpacity
              style={[styles.card, needsSignature && styles.cardSign]}
              activeOpacity={0.8}
              onPress={() => router.push(`/(client)/contracts/${item.id}` as never)}
            >
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title ?? `Contract${item.number ? ` #${item.number}` : ''}`}
                  </Text>
                  {item.title && item.number ? <Text style={styles.muted}>#{item.number}</Text> : null}
                  {item.eventLine ? <Text style={styles.sub}>{item.eventLine}</Text> : null}
                </View>
                <CliDocBadge cfg={cfg} />
              </View>
              {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
              <View style={styles.bottom}>
                <View style={{ flex: 1 }}>
                  {item.signedAt ? (
                    <Text style={[styles.muted, { color: Colors.successText }]}>Signed {fmtDate(item.signedAt)}</Text>
                  ) : item.sentAt ? (
                    <Text style={[styles.muted, { color: Colors.infoText }]}>Sent {fmtDate(item.sentAt)}</Text>
                  ) : null}
                  {item.createdAt ? <Text style={styles.muted}>Created {fmtDate(item.createdAt)}</Text> : null}
                </View>
                {needsSignature ? (
                  <View style={styles.signPill}>
                    <Ionicons name="create-outline" size={14} color={Colors.infoText} />
                    <Text style={styles.signText}>Sign Now</Text>
                  </View>
                ) : item.hasFile ? (
                  <Text style={styles.link}>View →</Text>
                ) : null}
              </View>
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
  cardSign: { borderWidth: 1, borderColor: Colors.info },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  desc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  muted: { fontSize: 12, color: Colors.textMuted },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  signPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.infoLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  signText: { fontSize: 12, fontWeight: '700', color: Colors.infoText },
  link: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
