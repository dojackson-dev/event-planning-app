import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
}

interface PromoterEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  image_url: string | null;
  status: 'draft' | 'published' | 'cancelled';
  ticket_tiers: TicketTier[];
}

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280', label: 'Draft' },
  published: { bg: Colors.successLight, text: Colors.successText, label: 'Published' },
  cancelled: { bg: Colors.errorLight, text: Colors.errorText, label: 'Cancelled' },
};

const fmtDate = (d: string) => {
  const date = new Date(`${d}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

function eventStats(tiers: TicketTier[]) {
  const sold = tiers.reduce((s, t) => s + (t.quantity_sold || 0), 0);
  const revenue = tiers.reduce((s, t) => s + (t.quantity_sold || 0) * (t.price || 0), 0);
  return { sold, revenue };
}

export default function PromoterEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<PromoterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPromoterAccount, setNoPromoterAccount] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNoPromoterAccount(false);
    try {
      const data = await apiRequest<PromoterEvent[]>('/promoter-events/mine');
      setEvents(data || []);
    } catch (err: any) {
      const message = err?.message || 'Failed to load events';
      if (message.toLowerCase().includes('promoter')) {
        setNoPromoterAccount(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return <LoadingState message="Loading your events..." />;
  }

  if (noPromoterAccount) {
    return (
      <EmptyState
        icon="megaphone-outline"
        title="No promoter account yet"
        message="Set up your promoter profile to start creating events and selling tickets."
      />
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <AppButton title="Retry" onPress={() => { setLoading(true); load(); }} style={styles.retryBtn} />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={events}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
      renderItem={({ item }) => {
        const meta = STATUS_META[item.status] || STATUS_META.draft;
        const { sold, revenue } = eventStats(item.ticket_tiers || []);
        const location = [item.venue_name, item.city].filter(Boolean).join(', ');
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/(promoter)/events/[id]', params: { id: item.id } })}
          >
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.dateText}>{fmtDate(item.event_date)}</Text>
              {!!location && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                </View>
              )}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="ticket-outline" size={14} color={Colors.purple} />
                  <Text style={styles.statText}>{sold} sold</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cash-outline" size={14} color={Colors.purple} />
                  <Text style={styles.statText}>{fmtMoney(revenue)}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title="No events yet"
          message="Events you create will appear here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 32 },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 12,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, ...Shadow.sm,
  },
  cardBody: { flex: 1, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 13, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted, flexShrink: 1 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
});
