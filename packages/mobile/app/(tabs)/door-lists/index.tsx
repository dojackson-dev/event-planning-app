import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import EvtErrorState from '@/components/EvtErrorState';
import { parseLocalDate, formatDate, formatTime } from '@/components/EvtDate';

interface OwnerEvent {
  id: string;
  name: string;
  date: string;
  startTime?: string | null;
  start_time?: string | null;
}

interface GuestListSummary {
  id: number;
  event_id?: number;
  eventId?: number;
  guests?: { id: number; has_arrived?: boolean; hasArrived?: boolean }[];
}

export default function DoorListsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<OwnerEvent[]>([]);
  const [guestLists, setGuestLists] = useState<GuestListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [eventsData, guestListsData] = await Promise.all([
        apiRequest<OwnerEvent[]>('/events'),
        apiRequest<GuestListSummary[]>('/guest-lists'),
      ]);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 1);
      cutoff.setHours(0, 0, 0, 0);
      const seen = new Set<string>();
      const seenKeys = new Set<string>();
      const relevant = (eventsData || []).filter((e) => {
        const d = parseLocalDate(e.date);
        if (!d || d < cutoff) return false;
        const nameKey = `${(e.name || '').toLowerCase().trim()}|${e.date}`;
        if (seen.has(e.id) || seenKeys.has(nameKey)) return false;
        seen.add(e.id);
        seenKeys.add(nameKey);
        return true;
      });
      relevant.sort((a, b) => a.date.localeCompare(b.date));

      setEvents(relevant);
      setGuestLists(guestListsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load door lists');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const findGuestList = (eventId: string) =>
    guestLists.find((gl) => String(gl.event_id ?? gl.eventId) === eventId);

  const handleRowPress = async (event: OwnerEvent) => {
    const existing = findGuestList(event.id);
    if (existing) {
      router.push(`/(tabs)/door-lists/${existing.id}` as any);
      return;
    }
    setCreatingFor(event.id);
    try {
      const created = await apiRequest<{ id: number }>('/guest-lists', {
        method: 'POST',
        body: { eventId: event.id, maxGuestsPerPerson: 0 },
      });
      router.push(`/(tabs)/door-lists/${created.id}` as any);
    } catch (err: any) {
      setError(err.message || 'Failed to create door list');
    } finally {
      setCreatingFor(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = q ? events.filter((e) => (e.name || '').toLowerCase().includes(q)) : events;

  if (loading) return <LoadingState message="Loading door lists…" />;
  if (error && events.length === 0) {
    return <EvtErrorState title="Couldn't load door lists" message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search events"
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
        />
      </View>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const gl = findGuestList(item.id);
          const guests = gl?.guests || [];
          const arrived = guests.filter((g) => !!(g.has_arrived ?? g.hasArrived)).length;
          const isCreating = creatingFor === item.id;
          return (
            <TouchableOpacity
              style={[styles.card, Shadow.sm]}
              activeOpacity={0.85}
              disabled={isCreating}
              onPress={() => handleRowPress(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.eventName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    {formatDate(item.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    {(item.startTime ?? item.start_time) ? ` at ${formatTime(item.startTime ?? item.start_time)}` : ''}
                  </Text>
                </View>
                {gl ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={13} color={Colors.success} />
                    <Text style={styles.statText}>{arrived} of {guests.length} arrived</Text>
                  </View>
                ) : (
                  <View style={styles.metaRow}>
                    <Ionicons name="add-circle-outline" size={13} color={Colors.primary} />
                    <Text style={styles.createText}>{isCreating ? 'Creating…' : 'Tap to create a door list'}</Text>
                  </View>
                )}
              </View>
              {isCreating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={q ? 'No matching events' : 'No upcoming events'}
            message={q ? 'Try a different search.' : 'Door lists can be created once you have an upcoming event.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.errorLight, paddingHorizontal: 16, paddingVertical: 8,
  },
  errorText: { fontSize: 13, color: Colors.errorText },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12,
  },
  eventName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted },
  statText: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  createText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
