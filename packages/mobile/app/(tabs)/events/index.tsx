import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';

interface EventRow {
  id: string;
  name?: string;
  date?: string;
  venue?: string;
  location?: string;
  status?: string;
  intake_form?: { contact_name?: string } | null;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  confirmed: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  completed: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  draft:     { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
};

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: fetchError } = await supabase
        .from('event')
        .select('id, name, date, venue, location, status, intake_form:intake_forms!intake_form_id(contact_name)')
        .eq('owner_id', user.id)
        .order('date', { ascending: true });
      if (fetchError) throw fetchError;
      setEvents((data as unknown as EventRow[]) || []);
    } catch (err: any) {
      console.error('Error fetching events:', err.message);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = events.filter(e => {
    if (filter === 'upcoming') return !e.date || e.date >= today;
    if (filter === 'past') return !!e.date && e.date < today;
    return true;
  });

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Couldn't load events</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={fetchEvents}>
          <Text style={styles.emptyBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {(['upcoming', 'past', 'all'] as const).map(f => (
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
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const ss = statusColors[item.status ?? ''] || statusColors.scheduled;
          const eventDate = item.date
            ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/events/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.stripe, { backgroundColor: ss.dot }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.eventName} numberOfLines={1}>{item.name || 'Untitled Event'}</Text>
                    {eventDate && <Text style={styles.dateText}>{eventDate}</Text>}
                    {(item.venue || item.location) && (
                      <Text style={styles.venueText} numberOfLines={1}>{item.venue || item.location}</Text>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                      <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                      <Text style={[styles.badgeText, { color: ss.text }]}>
                        {(item.status || 'scheduled').charAt(0).toUpperCase() + (item.status || 'scheduled').slice(1)}
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
            <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No {filter === 'all' ? '' : filter} events</Text>
            <Text style={styles.emptyText}>Events you create will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#FFF' },
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
  eventName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  venueText: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
