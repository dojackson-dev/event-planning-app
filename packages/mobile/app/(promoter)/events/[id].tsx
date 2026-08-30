import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  description?: string | null;
}

interface PromoterEventDetail {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  address: string | null;
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
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

export default function PromoterEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<PromoterEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await apiRequest<PromoterEventDetail>(`/promoter-events/${id}`);
      setEvent(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (loading) {
    return <LoadingState message="Loading event..." />;
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Event not found'}</Text>
        <AppButton title="Retry" onPress={() => { setLoading(true); load(); }} style={styles.retryBtn} />
      </View>
    );
  }

  const meta = STATUS_META[event.status] || STATUS_META.draft;
  const tiers = event.ticket_tiers || [];
  const totalSold = tiers.reduce((s, t) => s + (t.quantity_sold || 0), 0);
  const totalCapacity = tiers.reduce((s, t) => s + (t.quantity || 0), 0);
  const totalRevenue = tiers.reduce((s, t) => s + (t.quantity_sold || 0) * (t.price || 0), 0);
  const location = [event.venue_name, event.city, event.state].filter(Boolean).join(', ');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: event.title }} />

      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{event.title}</Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.metaText}>{fmtDate(event.event_date)}</Text>
        </View>
        {!!event.start_time && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{event.start_time}</Text>
          </View>
        )}
        {!!location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{location}</Text>
          </View>
        )}
        {!!event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalSold}{totalCapacity ? `/${totalCapacity}` : ''}</Text>
          <Text style={styles.statLabel}>Tickets Sold</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{fmtMoney(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <SectionHeader title="Ticket Tiers" />
      {tiers.length === 0 ? (
        <View style={styles.emptyTiers}>
          <Text style={styles.emptyTiersText}>No ticket tiers set up for this event</Text>
        </View>
      ) : (
        tiers.map((tier) => (
          <View key={tier.id} style={styles.tierCard}>
            <View style={styles.tierTop}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierPrice}>{fmtMoney(tier.price)}</Text>
            </View>
            <Text style={styles.tierMeta}>
              {tier.quantity_sold} / {tier.quantity} sold · {fmtMoney(tier.quantity_sold * tier.price)} revenue
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 32 },

  headerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20,
    marginBottom: 16, gap: 8, ...Shadow.md,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: Colors.textSecondary },
  description: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, alignItems: 'center', gap: 4, ...Shadow.sm,
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: Colors.purple },
  statLabel: { fontSize: 12, color: Colors.textSecondary },

  emptyTiers: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20,
    alignItems: 'center', marginBottom: 12,
  },
  emptyTiersText: { fontSize: 14, color: Colors.textMuted },

  tierCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14,
    marginBottom: 10, gap: 4, ...Shadow.sm,
  },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  tierPrice: { fontSize: 15, fontWeight: '700', color: Colors.purple },
  tierMeta: { fontSize: 12, color: Colors.textMuted },
});
