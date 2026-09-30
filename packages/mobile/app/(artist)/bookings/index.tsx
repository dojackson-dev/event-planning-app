import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';

interface OwnBooking {
  id: string;
  event_name: string;
  client_name: string;
  event_date: string | null;
  status: string;
  agreed_amount: number | null;
}

interface PromoterBooking {
  id: string;
  event_name?: string | null;
  event_date: string | null;
  status: string;
  agreed_amount: number | null;
  promoter_accounts?: { company_name: string | null; contact_name: string | null } | null;
}

type BookingItem =
  | ({ _source: 'own' } & OwnBooking)
  | ({ _source: 'promoter' } & PromoterBooking);

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  inquiry: { bg: Colors.borderLight, color: Colors.textSecondary, label: 'Inquiry' },
  pending: { bg: Colors.warningLight, color: Colors.warning, label: 'Pending' },
  estimate_sent: { bg: Colors.primaryLight, color: Colors.primary, label: 'Estimate Sent' },
  deposit_paid: { bg: Colors.warningLight, color: Colors.warning, label: 'Deposit Paid' },
  confirmed: { bg: Colors.successLight, color: Colors.success, label: 'Confirmed' },
  completed: { bg: Colors.purpleLight, color: Colors.purple, label: 'Completed' },
  cancelled: { bg: Colors.errorLight, color: Colors.error, label: 'Cancelled' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: Colors.borderLight, color: Colors.textSecondary, label: status };
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ArtistBookingsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ownResult, promoterResult] = await Promise.allSettled([
        apiRequest<OwnBooking[]>('/artist-bookings/mine'),
        apiRequest<PromoterBooking[]>('/promoter-bookings/for-artist'),
      ]);

      const own: BookingItem[] =
        ownResult.status === 'fulfilled'
          ? ownResult.value.map((b) => ({ _source: 'own' as const, ...b }))
          : [];
      const promoter: BookingItem[] =
        promoterResult.status === 'fulfilled'
          ? promoterResult.value.map((b) => ({ _source: 'promoter' as const, ...b }))
          : [];

      if (ownResult.status === 'rejected' && promoterResult.status === 'rejected') {
        setError('Failed to load bookings.');
      }

      const combined = [...own, ...promoter].sort((a, b) => {
        if (!a.event_date) return 1;
        if (!b.event_date) return -1;
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });
      setItems(combined);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const respond = async (id: string, action: 'accept' | 'decline') => {
    setRespondingId(id);
    try {
      await apiRequest(`/promoter-bookings/${id}/artist-respond`, {
        method: 'PATCH',
        body: { action },
      });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to respond to booking.');
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading bookings..." />;
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <SectionHeader title="Bookings" subtitle={`${items.length} total`} />

      {items.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message="Your direct bookings and promoter gig requests will show up here."
        />
      ) : (
        items.map((item) => {
          const label = item.event_name || (item._source === 'promoter' ? 'Promoter Gig' : 'Untitled Event');
          const subLabel =
            item._source === 'own'
              ? item.client_name
              : item.promoter_accounts?.company_name || item.promoter_accounts?.contact_name || 'Promoter';
          const canRespond =
            item._source === 'promoter' && !['confirmed', 'completed', 'cancelled'].includes(item.status);

          return (
            <View key={`${item._source}-${item.id}`} style={[styles.card, Shadow.sm]}>
              <TouchableOpacity
                onPress={() => router.push(`/(artist)/bookings/${item.id}?source=${item._source}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{label}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{subLabel}</Text>
                  </View>
                  <StatusPill status={item.status} />
                </View>
                <View style={styles.cardRow}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.cardMeta}>{formatDate(item.event_date)}</Text>
                  {item._source === 'promoter' && (
                    <View style={styles.sourceTag}>
                      <Text style={styles.sourceTagText}>Promoter</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {canRespond && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => respond(item.id, 'decline')}
                    disabled={respondingId === item.id}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => respond(item.id, 'accept')}
                    disabled={respondingId === item.id}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24 },
  errorText: { color: Colors.textSecondary, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.lg },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  cardMeta: { fontSize: 12, color: Colors.textMuted },
  sourceTag: {
    marginLeft: 'auto',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sourceTagText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: Radius.lg, alignItems: 'center' },
  declineBtn: { backgroundColor: Colors.errorLight },
  declineText: { color: Colors.error, fontWeight: '700', fontSize: 13 },
  acceptBtn: { backgroundColor: Colors.successLight },
  acceptText: { color: Colors.success, fontWeight: '700', fontSize: 13 },
});
