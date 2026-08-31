import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface PromoterBookingDetail {
  id: string;
  event_name: string;
  client_name: string;
  client_email: string;
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
  artist_name?: string | null;
  artist_accounts?: {
    artist_name?: string;
    stage_name?: string;
    booking_email?: string;
    booking_phone?: string;
  } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  inquiry: { bg: '#F3F4F6', text: '#374151' },
  estimate_sent: { bg: '#DBEAFE', text: '#1D4ED8' },
  deposit_paid: { bg: '#FEF3C7', text: '#B45309' },
  confirmed: { bg: '#D1FAE5', text: '#047857' },
  completed: { bg: '#EDE9FE', text: '#6D28D9' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<PromoterBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await apiRequest<PromoterBookingDetail>(`/promoter-bookings/${id}`);
      setBooking(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCancel = () => {
    Alert.alert(
      'Cancel booking?',
      'This will mark the booking as cancelled.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const data = await apiRequest<PromoterBookingDetail>(`/promoter-bookings/${id}`, {
                method: 'PUT',
                body: { status: 'cancelled' },
              });
              setBooking(data);
            } catch (e: any) {
              Alert.alert('Failed to update booking', e.message || 'Please try again.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
      </View>
    );
  }

  const sc = STATUS_COLORS[booking.status] || STATUS_COLORS.inquiry;
  const artistName = booking.artist_accounts?.stage_name || booking.artist_accounts?.artist_name || booking.artist_name;
  const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={[styles.headerCard, Shadow.md]}>
        <Text style={styles.eventName}>{booking.event_name}</Text>
        <View style={[styles.pill, { backgroundColor: sc.bg, alignSelf: 'flex-start' }]}>
          <Text style={[styles.pillText, { color: sc.text }]}>{STATUS_LABELS[booking.status] || booking.status}</Text>
        </View>
      </View>

      {/* Artist */}
      {artistName && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Artist</Text>
          <View style={styles.row}>
            <Ionicons name="mic-outline" size={15} color={Colors.purple} />
            <Text style={styles.artistText}>{artistName}</Text>
          </View>
        </View>
      )}

      {/* Event details */}
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.cardTitle}>Event Details</Text>
        {booking.event_date && (
          <InfoRow
            icon="calendar-outline"
            label="Date"
            value={`${booking.event_date}${booking.event_start_time ? ` at ${booking.event_start_time}` : ''}`}
          />
        )}
        {booking.venue_name && <InfoRow icon="location-outline" label="Venue" value={booking.venue_name} />}
        {booking.venue_address && <InfoRow icon="map-outline" label="Address" value={booking.venue_address} />}
      </View>

      {/* Client */}
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.cardTitle}>Client</Text>
        <InfoRow icon="person-outline" label="Name" value={booking.client_name} />
        <InfoRow icon="mail-outline" label="Email" value={booking.client_email} />
        {booking.client_phone && <InfoRow icon="call-outline" label="Phone" value={booking.client_phone} />}
      </View>

      {/* Financials */}
      {(booking.agreed_amount != null || booking.deposit_amount != null) && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Financials</Text>
          {booking.agreed_amount != null && (
            <InfoRow icon="cash-outline" label="Agreed Amount" value={`$${Number(booking.agreed_amount).toLocaleString()}`} />
          )}
          {booking.deposit_amount != null && (
            <InfoRow icon="card-outline" label="Deposit" value={`$${Number(booking.deposit_amount).toLocaleString()}`} />
          )}
        </View>
      )}

      {/* Notes */}
      {booking.notes && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Notes</Text>
          <Text style={styles.notes}>{booking.notes}</Text>
        </View>
      )}

      {/* Actions */}
      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, updating && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={updating}
          activeOpacity={0.85}
        >
          {updating ? (
            <ActivityIndicator color={Colors.error} />
          ) : (
            <Text style={styles.cancelBtnText}>Mark as Cancelled</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 18,
    gap: 10,
  },
  eventName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  artistText: { fontSize: 14, color: Colors.purple, fontWeight: '600' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, maxWidth: '55%', textAlign: 'right' },

  notes: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
