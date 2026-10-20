import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctSelect from '@/components/AcctSelect';
import { SecurityRow, secName, secEventId, secArrival, secEventStart, secLocalDate } from '@/components/AcctSecurity';

interface EventOption { id: string; name: string; date: string }

export default function SecurityListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<SecurityRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [sec, ev] = await Promise.all([
        apiRequest<SecurityRow[]>('/security'),
        apiRequest<EventOption[]>('/events').catch(() => [] as EventOption[]),
      ]);
      setRows(Array.isArray(sec) ? sec : []);
      setEvents(Array.isArray(ev) ? ev : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security personnel.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(s =>
      (!q || secName(s).toLowerCase().includes(q) || (s.phone ?? '').includes(q))
      && (!eventFilter || secEventId(s) === eventFilter));
  }, [rows, search, eventFilter]);

  const eventOptions = useMemo(() => events.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: e.date ? secLocalDate(e.date).toLocaleDateString() : undefined,
  })), [events]);

  const renderItem = ({ item: s }: { item: SecurityRow }) => {
    const arrival = secArrival(s);
    const start = secEventStart(s);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(tabs)/security/[id]', params: { id: s.id } } as any)}
      >
        <View style={styles.top}>
          <View style={styles.iconWrap}><Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{secName(s)}</Text>
            <Text style={styles.phone}>{s.phone || 'No phone'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
        {s.event ? (
          <Text style={styles.eventLine} numberOfLines={1}>
            {s.event.name}
            {s.event.date ? ` · ${secLocalDate(s.event.date).toLocaleDateString()}` : ''}
            {start ? ` at ${start}` : ''}
          </Text>
        ) : <Text style={styles.noEvent}>No event assigned</Text>}
        {arrival ? (
          <View style={[styles.pill, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.pillText, { color: Colors.successText }]}>
              Arrived {new Date(arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: Colors.warningLight }]}>
            <Text style={[styles.pillText, { color: Colors.warningText }]}>Not yet arrived</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingState message="Loading security…" />;
  if (error && rows.length === 0) return <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or phone…"
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
              />
            </View>
            {events.length > 0 && (
              <AcctSelect label="Event" value={eventFilter} options={eventOptions} onChange={setEventFilter} placeholder="All events" emptyLabel="All events" />
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-outline"
            title={rows.length === 0 ? 'No security personnel yet' : 'No security personnel found'}
            message={rows.length === 0 ? 'Add your first security personnel to track arrivals.' : 'Try adjusting your search or event filter.'}
          />
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/(tabs)/security/[id]', params: { id: 'new' } } as any)}>
        <Ionicons name="add" size={20} color={Colors.textWhite} />
        <Text style={styles.fabText}>Add Security</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  inlineError: { color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 12, fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, marginBottom: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12, ...Shadow.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  eventLine: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  noEvent: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  pillText: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...Shadow.lg },
  fabText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
