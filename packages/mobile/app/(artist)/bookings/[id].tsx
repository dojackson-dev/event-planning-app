import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

interface BookingDetail {
  id: string;
  event_name?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  event_date?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  agreed_amount?: number | null;
  deposit_amount?: number | null;
  notes?: string | null;
  status: string;
  promoter_accounts?: {
    company_name: string | null;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  inquiry: { bg: Colors.borderLight, color: Colors.textSecondary, label: 'Inquiry' },
  pending: { bg: Colors.warningLight, color: Colors.warning, label: 'Pending' },
  estimate_sent: { bg: Colors.primaryLight, color: Colors.primary, label: 'Estimate Sent' },
  deposit_paid: { bg: Colors.warningLight, color: Colors.warning, label: 'Deposit Paid' },
  confirmed: { bg: Colors.successLight, color: Colors.success, label: 'Confirmed' },
  completed: { bg: Colors.purpleLight, color: Colors.purple, label: 'Completed' },
  cancelled: { bg: Colors.errorLight, color: Colors.error, label: 'Cancelled' },
};

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ArtistBookingDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const isPromoter = source === 'promoter';
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const path = isPromoter ? `/promoter-bookings/${id}` : `/artist-bookings/${id}`;
      const data = await apiRequest<BookingDetail>(path);
      setBooking(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [id, isPromoter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const respond = async (action: 'accept' | 'decline') => {
    if (!id) return;
    setResponding(true);
    try {
      await apiRequest(`/promoter-bookings/${id}/artist-respond`, {
        method: 'PATCH',
        body: { action },
      });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to respond to booking.');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading booking..." />;
  }

  if (error || !booking) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Booking not found"
        message={error || 'This booking could not be loaded.'}
      />
    );
  }

  const statusStyle =
    STATUS_STYLES[booking.status] || { bg: Colors.borderLight, color: Colors.textSecondary, label: booking.status };
  const canRespond = isPromoter && !['confirmed', 'completed', 'cancelled'].includes(booking.status);
  const promoterName = booking.promoter_accounts?.company_name || booking.promoter_accounts?.contact_name;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.sm]}>
        <View style={styles.headerRow}>
          <Text style={styles.eventName}>{booking.event_name || 'Untitled Event'}</Text>
          <View style={[styles.pill, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.pillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        </View>
        {(booking.client_name || promoterName) && (
          <Text style={styles.subLabel}>
            {isPromoter ? `Booked by ${promoterName || 'Promoter'}` : booking.client_name}
          </Text>
        )}
      </View>

      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <InfoRow icon="calendar-outline" label="Date" value={fmtDate(booking.event_date)} />
        {(booking.event_start_time || booking.event_end_time) && (
          <InfoRow
            icon="time-outline"
            label="Time"
            value={`${booking.event_start_time || 'TBD'} - ${booking.event_end_time || 'TBD'}`}
          />
        )}
        {booking.venue_name && <InfoRow icon="location-outline" label="Venue" value={booking.venue_name} />}
        {booking.venue_address && <InfoRow icon="map-outline" label="Address" value={booking.venue_address} />}
      </View>

      {(booking.agreed_amount != null || booking.deposit_amount != null) && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Financial Terms</Text>
          {booking.agreed_amount != null && (
            <InfoRow icon="cash-outline" label="Agreed Amount" value={fmtMoney(booking.agreed_amount)} />
          )}
          {booking.deposit_amount != null && (
            <InfoRow icon="wallet-outline" label="Deposit" value={fmtMoney(booking.deposit_amount)} />
          )}
        </View>
      )}

      {!isPromoter && (booking.client_email || booking.client_phone) && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Client Contact</Text>
          {booking.client_email && <InfoRow icon="mail-outline" label="Email" value={booking.client_email} />}
          {booking.client_phone && <InfoRow icon="call-outline" label="Phone" value={booking.client_phone} />}
        </View>
      )}

      {booking.notes && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{booking.notes}</Text>
        </View>
      )}

      {canRespond && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => respond('decline')}
            disabled={responding}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => respond('accept')}
            disabled={responding}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  eventName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  subLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.textMuted },
  infoValue: { fontSize: 14, color: Colors.textPrimary, marginTop: 2, fontWeight: '600' },
  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 20 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.lg, alignItems: 'center' },
  declineBtn: { backgroundColor: Colors.errorLight },
  declineText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  acceptBtn: { backgroundColor: Colors.successLight },
  acceptText: { color: Colors.success, fontWeight: '700', fontSize: 14 },
});
