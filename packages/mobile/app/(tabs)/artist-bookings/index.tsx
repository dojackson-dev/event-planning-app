import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import { bookingStatusMeta, RoleBooking } from '@/components/role/BookingListScreen';

const fmt = (n?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

type Segment = 'mine' | 'requests';

interface PromoterRequest extends RoleBooking {
  promoter_accounts?: { company_name?: string; contact_name?: string; email?: string; phone?: string };
}

export default function ArtistBookingsScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('mine');
  const [myBookings, setMyBookings] = useState<RoleBooking[]>([]);
  const [requests, setRequests] = useState<PromoterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, reqs] = await Promise.all([
        apiRequest<RoleBooking[]>('/artist-bookings/mine').catch(() => []),
        apiRequest<PromoterRequest[]>('/promoter-bookings/for-artist').catch(() => []),
      ]);
      setMyBookings(mine || []);
      setRequests(reqs || []);
    } catch (err: any) {
      console.error('Error loading artist bookings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const respond = async (id: string, action: 'accept' | 'decline') => {
    setActioningId(id);
    try {
      await apiRequest(`/promoter-bookings/${id}/artist-respond`, { method: 'PATCH', body: { action } });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActioningId(null);
    }
  };

  const confirmRespond = (id: string, action: 'accept' | 'decline') => {
    Alert.alert(
      action === 'accept' ? 'Accept Booking' : 'Decline Booking',
      action === 'accept' ? 'Confirm this booking request?' : 'Are you sure you want to decline this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: action === 'accept' ? 'Accept' : 'Decline', style: action === 'decline' ? 'destructive' : 'default', onPress: () => respond(id, action) },
      ]
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const data = segment === 'mine' ? myBookings : requests;

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === 'mine' && styles.segmentBtnActive]}
          onPress={() => setSegment('mine')}
        >
          <Text style={[styles.segmentText, segment === 'mine' && styles.segmentTextActive]}>My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === 'requests' && styles.segmentBtnActive]}
          onPress={() => setSegment('requests')}
        >
          <Text style={[styles.segmentText, segment === 'requests' && styles.segmentTextActive]}>
            Booking Requests{requests.length > 0 ? ` (${requests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={data}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const meta = bookingStatusMeta[item.status] || { label: item.status, bg: '#F3F4F6', text: '#6B7280' };
          const eventDate = item.event_date
            ? new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
          const promoterName = segment === 'requests'
            ? (item as PromoterRequest).promoter_accounts?.company_name
            : item.client_name;
          const isPending = segment === 'requests' && !['confirmed', 'cancelled'].includes(item.status);

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={segment === 'mine' ? 0.75 : 1}
              onPress={() => segment === 'mine' && router.push(`/(tabs)/artist-bookings/${item.id}` as any)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName} numberOfLines={1}>{promoterName || 'Promoter'}</Text>
                  {item.event_name && <Text style={styles.eventName} numberOfLines={1}>{item.event_name}</Text>}
                  {(eventDate || item.venue_name) && (
                    <Text style={styles.metaText} numberOfLines={1}>
                      {[eventDate, item.venue_name].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {item.agreed_amount != null && <Text style={styles.amount}>{fmt(item.agreed_amount)}</Text>}
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                  </View>
                </View>
              </View>

              {isPending && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => confirmRespond(item.id, 'decline')}
                    disabled={actioningId === item.id}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => confirmRespond(item.id, 'accept')}
                    disabled={actioningId === item.id}
                  >
                    {actioningId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{segment === 'mine' ? 'No bookings yet' : 'No booking requests'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  segmentRow: { flexDirection: 'row', margin: 16, marginBottom: 4, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#FFF' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 10,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  metaText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: Radius.md, alignItems: 'center' },
  declineBtn: { backgroundColor: Colors.errorLight },
  declineBtnText: { color: Colors.error, fontWeight: '700', fontSize: 13 },
  acceptBtn: { backgroundColor: Colors.success },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
});
