import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Shadow, Radius } from '@/lib/theme';

interface Event {
  id: string;
  name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  guest_count?: number;
  status?: string;
  intake_form?: { event_type?: string } | null;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: '#DBEAFE', text: '#1E40AF' },
  confirmed:  { bg: '#D1FAE5', text: '#065F46' },
  completed:  { bg: '#F3F4F6', text: '#6B7280' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
};

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('event')
        .select('*, intake_form:intake_forms!intake_form_id(event_type)')
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

  const formatTime = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={events}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      renderItem={({ item }) => {
        const ss = statusColors[item.status || ''] || { bg: '#F3F4F6', text: '#6B7280' };
        const eventType = item.intake_form?.event_type;
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                </Text>
                <Text style={styles.dateMonth}>
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.cardMain}>
                <Text style={styles.eventName} numberOfLines={1}>{item.name}</Text>
                {eventType && (
                  <Text style={styles.eventType}>
                    {eventType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                <Text style={[styles.statusText, { color: ss.text }]}>
                  {(item.status || 'scheduled').charAt(0).toUpperCase() + (item.status || 'scheduled').slice(1)}
                </Text>
              </View>
            </View>
            {(item.start_time || item.venue || item.guest_count) && (
              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  {item.start_time && (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>
                        {formatTime(item.start_time)}{item.end_time ? ` - ${formatTime(item.end_time)}` : ''}
                      </Text>
                    </View>
                  )}
                  {item.venue && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText} numberOfLines={1}>{item.venue}</Text>
                    </View>
                  )}
                  {item.guest_count && (
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{item.guest_count} guests</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>Events you create will appear here</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  dateBadge: { width: 48, height: 48, backgroundColor: '#E0F2FE', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dateDay: { fontSize: 18, fontWeight: '700', color: '#0284C7' },
  dateMonth: { fontSize: 10, fontWeight: '600', color: '#0C4A6E', textTransform: 'uppercase' },
  cardMain: { flex: 1 },
  eventName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  eventType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardFooter: { paddingHorizontal: 16, paddingBottom: 14 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#6B7280' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
