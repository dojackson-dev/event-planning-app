import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface PromoterVendorBookingDetail {
  id: string;
  event_name?: string;
  event_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  notes?: string | null;
  status: string;
  agreed_amount?: number | null;
  deposit_amount?: number | null;
  vendor_accounts?: { business_name?: string; category?: string; phone?: string; email?: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  declined: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  completed: { bg: '#DBEAFE', text: '#1E40AF' },
  paid: { bg: '#EDE9FE', text: '#6D28D9' },
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

export default function PromoterVendorBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<PromoterVendorBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await apiRequest<PromoterVendorBookingDetail>(`/vendors/bookings/${id}`);
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
    Alert.alert('Cancel booking?', 'This will mark the booking as cancelled.', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            await apiRequest(`/vendors/bookings/${id}`, { method: 'PUT', body: { status: 'cancelled' } });
            await load();
          } catch (e: any) {
            Alert.alert('Failed to update booking', e.message || 'Please try again.');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
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

  const sc = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
  const canCancel = !['cancelled', 'completed', 'paid', 'declined'].includes(booking.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.headerCard, Shadow.md]}>
        <View style={styles.headerRow}>
          <Text style={styles.eventName}>{booking.event_name || 'Booking'}</Text>
          <View style={[styles.pill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.pillText, { color: sc.text }]}>{booking.status}</Text>
          </View>
        </View>
        {booking.vendor_accounts?.business_name && (
          <Text style={styles.vendorName}>{booking.vendor_accounts.business_name}</Text>
        )}
      </View>

      <View style={[styles.card, Shadow.sm]}>
        {booking.event_date && (
          <InfoRow icon="calendar-outline" label="Date" value={booking.event_date} />
        )}
        {booking.start_time && (
          <InfoRow icon="time-outline" label="Time" value={`${booking.start_time}${booking.end_time ? ` – ${booking.end_time}` : ''}`} />
        )}
        {booking.venue_name && (
          <InfoRow icon="location-outline" label="Venue" value={booking.venue_name} />
        )}
        {booking.agreed_amount != null && (
          <InfoRow icon="cash-outline" label="Agreed Amount" value={`$${Number(booking.agreed_amount).toLocaleString()}`} />
        )}
        {booking.deposit_amount != null && (
          <InfoRow icon="wallet-outline" label="Deposit" value={`$${Number(booking.deposit_amount).toLocaleString()}`} />
        )}
        {booking.vendor_accounts?.phone && (
          <InfoRow icon="call-outline" label="Vendor Phone" value={booking.vendor_accounts.phone} />
        )}
        {booking.vendor_accounts?.email && (
          <InfoRow icon="mail-outline" label="Vendor Email" value={booking.vendor_accounts.email} />
        )}
      </View>

      {booking.notes && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{booking.notes}</Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, updating && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventName: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  vendorName: { fontSize: 14, color: Colors.purple, fontWeight: '600', marginTop: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  pillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, color: Colors.textMuted },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  notesLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  notesText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

  cancelBtn: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
