import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';

interface TicketTier { id: string; name: string; price: number; quantity: number; quantity_sold: number; }
interface PromoterEvent {
  id: string; title: string; event_date: string; venue_name?: string; city?: string; state?: string;
  status: 'draft' | 'published' | 'cancelled'; image_url?: string; ticket_tiers?: TicketTier[];
}

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: '#F3F4F6', text: '#6B7280' },
  published: { label: 'Published', bg: '#D1FAE5', text: '#065F46' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', text: '#991B1B' },
};

export default function PromoterEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<PromoterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<PromoterEvent[]>('/promoter-events/mine');
      setEvents(data || []);
    } catch (err: any) {
      console.error('Error loading events:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={events}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      ListHeaderComponent={
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(tabs)/promoter-events/new' as any)}>
          <Ionicons name="add-circle" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>New Event</Text>
        </TouchableOpacity>
      }
      renderItem={({ item }) => {
        const meta = statusMeta[item.status] || statusMeta.draft;
        const ticketsSold = (item.ticket_tiers || []).reduce((s, t) => s + (t.quantity_sold || 0), 0);
        const ticketsTotal = (item.ticket_tiers || []).reduce((s, t) => s + (t.quantity || 0), 0);
        const eventDate = item.event_date
          ? new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(tabs)/promoter-events/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {[eventDate, item.venue_name || item.city].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
              </View>
            </View>
            {ticketsTotal > 0 && (
              <Text style={styles.ticketsText}>{ticketsSold} / {ticketsTotal} tickets sold</Text>
            )}
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>Create your first event to start selling tickets.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 12, marginBottom: 14,
  },
  newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  metaText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  ticketsText: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
