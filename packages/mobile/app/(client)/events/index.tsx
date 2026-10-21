import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { clientApi, ClientAuthError } from '@/lib/clientApi';
import { toList, titleCase } from '@/components/netFormat';
import { parseLocalDate, formatDate, formatTimeRange, todayKey } from '@/components/EvtDate';
import { EVENT_TYPE_LABELS, pick, resolveEventStatus, statusLabel, statusColors } from '@/components/CliShared';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import CliErrorState from '@/components/CliErrorState';

function sortEvents(list: any[]): any[] {
  const today = todayKey();
  const key = (e: any) => String(e?.date ?? '').slice(0, 10);
  const upcoming = list.filter((e) => !key(e) || key(e) >= today).sort((a, b) => key(a).localeCompare(key(b)));
  const past = list.filter((e) => key(e) && key(e) < today).sort((a, b) => key(b).localeCompare(key(a)));
  return [...upcoming, ...past];
}

export default function ClientEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await clientApi('/events');
      setEvents(sortEvents(toList(res)));
      setError(null);
    } catch (e: any) {
      if (e instanceof ClientAuthError) {
        router.replace('/(auth)/client-login' as never);
        return;
      }
      setError(e?.message || 'Failed to load your events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState message="Loading events..." />;
  if (error && events.length === 0) {
    return <CliErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={events.length === 0 ? styles.emptyContent : styles.content}
      data={events}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={Colors.primary} />}
      ListHeaderComponent={
        events.length > 0 ? (
          <Text style={styles.count}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="No events scheduled yet"
          message="Events will appear here as soon as your coordinator schedules them."
        />
      }
      renderItem={({ item }) => {
        const status = resolveEventStatus(item);
        const colors = statusColors(status);
        const time = formatTimeRange(item.start_time ?? item.startTime, item.end_time ?? item.endTime);
        const date = formatDate(item.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const type = pick<string>(item, 'event_type', 'eventType');
        const venue = pick<string>(item, 'venue', 'venue_name');
        const isPast = !!parseLocalDate(item.date) && String(item.date).slice(0, 10) < todayKey();
        return (
          <TouchableOpacity
            style={[styles.card, Shadow.sm, isPast && styles.cardPast]}
            activeOpacity={0.8}
            onPress={() => router.push(`/(client)/events/${encodeURIComponent(String(item.id))}` as never)}
          >
            <View style={styles.cardTop}>
              <Text style={styles.name} numberOfLines={2}>{item.name || 'Event'}</Text>
              <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                <Text style={[styles.pillText, { color: colors.fg }]}>{statusLabel(status)}</Text>
              </View>
            </View>
            {!!type && <Text style={styles.type}>{EVENT_TYPE_LABELS[type] ?? titleCase(type)}</Text>}
            {!!date && (
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.meta}>{date}</Text>
              </View>
            )}
            {!!time && (
              <View style={styles.row}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.meta}>{time}</Text>
              </View>
            )}
            {!!venue && (
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.meta} numberOfLines={1}>{venue}</Text>
              </View>
            )}
            {!!item.vendor_name && (
              <View style={styles.row}>
                <Ionicons name="musical-notes-outline" size={14} color={Colors.success} />
                <Text style={[styles.meta, { color: Colors.successText, fontWeight: '600' }]}>{item.vendor_name}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  emptyContent: { flexGrow: 1, padding: 16 },
  count: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12, gap: 4,
  },
  cardPast: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  type: { fontSize: 12, color: Colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { flex: 1, fontSize: 13, color: Colors.textSecondary },
});
