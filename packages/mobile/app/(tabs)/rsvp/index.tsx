import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import EvtErrorState from '@/components/EvtErrorState';
import { formatDate } from '@/components/EvtDate';

export interface RsvpEvent {
  intake_form_id: string;
  contact_name?: string;
  event_name: string | null;
  event_date: string | null;
  rsvp_summary: { total: number; attending: number; declined: number; pending: number; headcount: number };
}

export default function RsvpEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<RsvpEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<RsvpEvent[]>('/rsvp/events');
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load RSVP events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState message="Loading RSVP events…" />;
  if (error && events.length === 0) {
    return <EvtErrorState title="Couldn't load RSVPs" message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={events}
      keyExtractor={(e) => e.intake_form_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      ListHeaderComponent={<Text style={styles.intro}>Send personalized RSVP links to your guests.</Text>}
      renderItem={({ item: ev }) => {
        const s = ev.rsvp_summary || { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 };
        return (
          <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            activeOpacity={0.85}
            onPress={() => router.push(`/(tabs)/rsvp/${ev.intake_form_id}` as any)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{ev.event_name ?? 'Unnamed Event'}</Text>
              {ev.event_date ? (
                <Text style={styles.meta}>{formatDate(ev.event_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
              ) : null}
              <Text style={styles.meta}>
                {s.headcount > s.attending ? `${s.headcount} attending (w/ +1s)` : `${s.attending} attending`} · {s.pending} pending
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.total}>{s.total}</Text>
              <Text style={styles.totalLabel}>guests</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={<EmptyState icon="mail-open-outline" title="No events found" message="RSVP is available once you have a booked event." />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  intro: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12,
  },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textMuted, marginTop: 3 },
  right: { alignItems: 'center' },
  total: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  totalLabel: { fontSize: 11, color: Colors.textMuted },
});
