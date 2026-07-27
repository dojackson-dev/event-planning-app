import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';

interface Event {
  id: string;
  name: string;
  // display label: derived from intake_form
  date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  max_guests?: number;
  status?: string;
  client_name?: string;
  intake_form?: { event_type?: string; event_name?: string; contact_name?: string } | null;
}

const statusMeta: Record<string, { bg: string; text: string; stripe: string }> = {
  scheduled:  { bg: '#DBEAFE', text: '#1E40AF', stripe: '#3B82F6' },
  confirmed:  { bg: '#D1FAE5', text: '#065F46', stripe: '#10B981' },
  completed:  { bg: '#F3F4F6', text: '#6B7280', stripe: '#9CA3AF' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B', stripe: '#EF4444' },
  draft:      { bg: '#F3F4F6', text: '#6B7280', stripe: '#A78BFA' },
};

const formatTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatEventType = (type?: string) =>
  type ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

export default function EventsListScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result = events;
    if (filter === 'upcoming') {
      result = events.filter(e => new Date(e.date + 'T00:00:00') >= today);
    } else if (filter === 'past') {
      result = events.filter(e => new Date(e.date + 'T00:00:00') < today);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.intake_form?.contact_name?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [events, search, filter]);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('event')
        .select('*, intake_form:intake_forms!intake_form_id(event_type, event_name, contact_name)')
        .eq('owner_id', user.id)
        .order('date', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Events' }} />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Events' }} />
      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, clients..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} onPress={() => setSearch('')} />
            )}
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['upcoming', 'all', 'past'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          contentContainerStyle={styles.content}
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => {
            const sm = statusMeta[item.status || ''] || statusMeta.draft;
            const clientName = item.intake_form?.contact_name;
            const displayName = item.intake_form?.event_name || formatEventType(item.intake_form?.event_type) || item.name;
            const eventType = formatEventType(item.intake_form?.event_type);
            const dateObj = new Date(item.date + 'T00:00:00');
            const isPast = dateObj < new Date();

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(tabs)/events/${item.id}` as any)}
                activeOpacity={0.75}
              >
                {/* Color stripe */}
                <View style={[styles.stripe, { backgroundColor: isPast ? '#D1D5DB' : sm.stripe }]} />

                <View style={styles.cardBody}>
                  {/* Top row: left info + status badge */}
                  <View style={styles.cardTop}>
                    <View style={styles.dateBadge}>
                      <Text style={[styles.dateDay, { color: isPast ? '#6B7280' : Colors.primary }]}>
                        {dateObj.getDate()}
                      </Text>
                      <Text style={[styles.dateMonth, { color: isPast ? '#9CA3AF' : Colors.primaryText }]}>
                        {dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      {clientName && (
                        <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                      )}
                      <Text style={styles.eventName} numberOfLines={1}>{displayName}</Text>
                      {eventType && (
                        <Text style={styles.eventType} numberOfLines={1}>{eventType}</Text>
                      )}
                    </View>
                    <View style={styles.cardRight}>
                      <View style={[styles.statusBadge, { backgroundColor: isPast ? '#F3F4F6' : sm.bg }]}>
                        <Text style={[styles.statusText, { color: isPast ? '#6B7280' : sm.text }]}>
                          {(item.status || 'scheduled').charAt(0).toUpperCase() + (item.status || 'scheduled').slice(1)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 8 }} />
                    </View>
                  </View>

                  {/* Meta row */}
                  {(item.start_time || item.venue || item.max_guests) && (
                    <View style={styles.metaRow}>
                      {item.start_time && (
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                          <Text style={styles.metaText}>
                            {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                          </Text>
                        </View>
                      )}
                      {item.venue && (
                        <View style={styles.metaItem}>
                          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                          <Text style={styles.metaText} numberOfLines={1}>{item.venue}</Text>
                        </View>
                      )}
                      {item.max_guests && (
                        <View style={styles.metaItem}>
                          <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                          <Text style={styles.metaText}>{item.max_guests} guests</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{search ? 'No results found' : `No ${filter === 'all' ? '' : filter + ' '}events`}</Text>
              <Text style={styles.emptyText}>Events you create will appear here</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  stripe: { height: 4, width: '100%' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },

  dateBadge: {
    width: 50, minHeight: 50, backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  dateDay: { fontSize: 20, fontWeight: '800' },
  dateMonth: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  cardInfo: { flex: 1 },
  clientName: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  eventName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  cardRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 11, fontWeight: '600' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
