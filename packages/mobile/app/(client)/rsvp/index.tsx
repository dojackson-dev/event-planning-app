import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import { rsvpApi } from '@/components/CliMsgRsvpApi';
import { formatDate, useClientFail } from '@/components/CliMsgShared';

export interface RsvpEvent {
  intake_form_id: string;
  contact_name: string;
  event_name: string | null;
  event_date: string | null;
  rsvp_summary: { total: number; attending: number; declined: number; pending: number; headcount: number };
}

export default function ClientRsvpEventsScreen() {
  const router = useRouter();
  const fail = useClientFail();
  const [events, setEvents] = useState<RsvpEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await rsvpApi<RsvpEvent[]>('/events');
      setEvents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(fail(err, 'Unable to load RSVP events.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fail]);

  // Reload on focus so guest counts reflect changes made on the detail screen.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.container}><LoadingState message="Loading events…" /></View>;
  if (error && events.length === 0) {
    return (
      <View style={styles.container}>
        <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.intake_form_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <>
            {error ? <Text style={styles.banner}>{error}</Text> : null}
            <Text style={styles.intro}>Send personalized RSVP links to your guests.</Text>
          </>
        }
        ListEmptyComponent={<EmptyState icon="people-outline" title="No events found" message="RSVP is available once you have a booked event." />}
        renderItem={({ item }) => {
          const s = item.rsvp_summary ?? { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/(client)/rsvp/[formId]', params: { formId: item.intake_form_id } } as never)}
            >
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>{item.event_name ?? 'Unnamed Event'}</Text>
                {item.event_date ? (
                  <Text style={styles.date}>{formatDate(item.event_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                ) : null}
                <Text style={styles.stats}>
                  {s.total} guest{s.total === 1 ? '' : 's'} · {s.headcount > s.attending ? `${s.headcount} attending (w/ +1s)` : `${s.attending} attending`} · {s.pending} pending
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 8 },
  intro: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.surface, borderRadius: Radius.lg, ...Shadow.sm },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  date: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  stats: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
});
