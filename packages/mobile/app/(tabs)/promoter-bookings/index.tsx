import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import { bookingStatusMeta, RoleBooking } from '@/components/role/BookingListScreen';

const fmt = (n?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

type Segment = 'artists' | 'requests';

interface LinkRequest {
  id: string; client_name: string; client_email: string; client_phone?: string;
  event_name?: string; event_date?: string; venue_name?: string; status: 'pending' | 'accepted' | 'declined';
}

const requestStatusMeta: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: '#FEF3C7', text: '#92400E' },
  accepted: { label: 'Accepted', bg: '#D1FAE5', text: '#065F46' },
  declined: { label: 'Declined', bg: '#FEE2E2', text: '#991B1B' },
};

export default function PromoterBookingsScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('artists');
  const [artistBookings, setArtistBookings] = useState<RoleBooking[]>([]);
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [bookings, reqs] = await Promise.all([
        apiRequest<RoleBooking[]>('/promoter-bookings/mine').catch(() => []),
        apiRequest<LinkRequest[]>('/promoter/booking-links/requests').catch(() => []),
      ]);
      setArtistBookings(bookings || []);
      setRequests(reqs || []);
    } catch (err: any) {
      console.error('Error loading promoter bookings:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const respondToRequest = async (id: string, status: 'accepted' | 'declined') => {
    setActioningId(id);
    try {
      await apiRequest(`/promoter/booking-links/requests/${id}`, { method: 'PUT', body: { status } });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActioningId(null);
    }
  };

  const confirmRespond = (id: string, status: 'accepted' | 'declined') => {
    Alert.alert(
      status === 'accepted' ? 'Accept Request' : 'Decline Request',
      status === 'accepted' ? 'Accept this booking request from the client?' : 'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: status === 'accepted' ? 'Accept' : 'Decline', style: status === 'declined' ? 'destructive' : 'default', onPress: () => respondToRequest(id, status) },
      ]
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        <TouchableOpacity style={[styles.segmentBtn, segment === 'artists' && styles.segmentBtnActive]} onPress={() => setSegment('artists')}>
          <Text style={[styles.segmentText, segment === 'artists' && styles.segmentTextActive]}>Artist Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, segment === 'requests' && styles.segmentBtnActive]} onPress={() => setSegment('requests')}>
          <Text style={[styles.segmentText, segment === 'requests' && styles.segmentTextActive]}>
            Link Requests{requests.filter(r => r.status === 'pending').length > 0 ? ` (${requests.filter(r => r.status === 'pending').length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {segment === 'artists' ? (
        <FlatList
          contentContainerStyle={styles.content}
          data={artistBookings}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => {
            const meta = bookingStatusMeta[item.status] || { label: item.status, bg: '#F3F4F6', text: '#6B7280' };
            const eventDate = item.event_date
              ? new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            return (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/promoter-bookings/${item.id}` as any)} activeOpacity={0.75}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName} numberOfLines={1}>{item.client_name || item.event_name || 'Booking'}</Text>
                    {item.event_name && <Text style={styles.eventName} numberOfLines={1}>{item.event_name}</Text>}
                    {(eventDate || item.venue_name) && (
                      <Text style={styles.metaText} numberOfLines={1}>{[eventDate, item.venue_name].filter(Boolean).join(' · ')}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {item.agreed_amount != null && <Text style={styles.amount}>{fmt(item.agreed_amount)}</Text>}
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No artist bookings yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={requests}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => {
            const meta = requestStatusMeta[item.status];
            const eventDate = item.event_date
              ? new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName} numberOfLines={1}>{item.client_name}</Text>
                    {item.event_name && <Text style={styles.eventName} numberOfLines={1}>{item.event_name}</Text>}
                    {(eventDate || item.venue_name) && (
                      <Text style={styles.metaText} numberOfLines={1}>{[eventDate, item.venue_name].filter(Boolean).join(' · ')}</Text>
                    )}
                  </View>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                  </View>
                </View>
                <View style={styles.contactRow}>
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${item.client_email}`)}>
                    <Text style={styles.contactText}>{item.client_email}</Text>
                  </TouchableOpacity>
                  {item.client_phone && (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.client_phone}`)}>
                      <Text style={styles.contactText}>{item.client_phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {item.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => confirmRespond(item.id, 'declined')} disabled={actioningId === item.id}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => confirmRespond(item.id, 'accepted')} disabled={actioningId === item.id}>
                      {actioningId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="link-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No booking link requests</Text>
            </View>
          }
        />
      )}
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
  contactRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  contactText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 9, borderRadius: Radius.md, alignItems: 'center' },
  declineBtn: { backgroundColor: Colors.errorLight },
  declineBtnText: { color: Colors.error, fontWeight: '700', fontSize: 13 },
  acceptBtn: { backgroundColor: Colors.success },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
});
