import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { bookingStatusMeta, RoleBooking } from './BookingListScreen';

const fmt = (n?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const formatDate = (s?: string) => {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

interface Props {
  /** e.g. '/vendors/bookings', '/artist-bookings', '/promoter-bookings' */
  apiBase: string;
  /** Valid statuses this booking type can be moved to */
  statusOptions: string[];
}

export default function BookingDetailScreen({ apiBase, statusOptions }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<RoleBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiRequest<RoleBooking>(`${apiBase}/${id}`);
      setBooking(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changeStatus = () => {
    const options = statusOptions.filter(s => s !== booking?.status);
    Alert.alert(
      'Update Status',
      'Select the new status for this booking',
      [
        ...options.map(s => ({
          text: (bookingStatusMeta[s]?.label) || s,
          onPress: async () => {
            setActioning(true);
            try {
              await apiRequest(`${apiBase}/${id}`, { method: 'PUT', body: { status: s } });
              await load();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActioning(false);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const callClient = () => {
    if (booking?.client_phone) Linking.openURL(`tel:${booking.client_phone}`);
  };

  const emailClient = () => {
    if (booking?.client_email) Linking.openURL(`mailto:${booking.client_email}`);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Booking' }} />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </>
    );
  }

  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ title: 'Booking' }} />
        <View style={styles.centered}><Text style={styles.errorText}>Booking not found</Text></View>
      </>
    );
  }

  const meta = bookingStatusMeta[booking.status] || { label: booking.status, bg: '#F3F4F6', text: '#6B7280' };
  const startTime = booking.start_time || booking.event_start_time;
  const endTime = booking.end_time || booking.event_end_time;

  return (
    <>
      <Stack.Screen options={{ title: booking.event_name || 'Booking' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{booking.client_name || 'Client'}</Text>
              {booking.event_name && <Text style={styles.eventName}>{booking.event_name}</Text>}
            </View>
            <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>
          {booking.agreed_amount != null && <Text style={styles.totalAmount}>{fmt(booking.agreed_amount)}</Text>}
          {booking.deposit_amount != null && booking.deposit_amount > 0 && (
            <Text style={styles.depositText}>{fmt(booking.deposit_amount)} deposit</Text>
          )}
        </View>

        <View style={styles.actionRow}>
          {statusOptions.length > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={changeStatus} disabled={actioning}>
              {actioning ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <>
                  <Ionicons name="swap-horizontal-outline" size={16} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Update Status</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {booking.client_phone && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={callClient}>
              <Ionicons name="call-outline" size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>Call</Text>
            </TouchableOpacity>
          )}
          {booking.client_email && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnBlue]} onPress={emailClient}>
              <Ionicons name="mail-outline" size={16} color={Colors.info} />
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Event Details</Text>
          <View style={styles.card}>
            <InfoRow label="Event Date" value={formatDate(booking.event_date)} />
            {(startTime || endTime) && <InfoRow label="Time" value={`${startTime || '—'} – ${endTime || '—'}`} />}
            {booking.venue_name && <InfoRow label="Venue" value={booking.venue_name} />}
            {booking.venue_address && <InfoRow label="Address" value={booking.venue_address} />}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Client</Text>
          <View style={styles.card}>
            {booking.client_name && <InfoRow label="Name" value={booking.client_name} />}
            {booking.client_email && <InfoRow label="Email" value={booking.client_email} />}
            {booking.client_phone && <InfoRow label="Phone" value={booking.client_phone} />}
          </View>
        </View>

        {booking.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.card}><Text style={styles.notesText}>{booking.notes}</Text></View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 16 },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, ...Shadow.md, marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  clientName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { fontSize: 13, fontWeight: '700' },
  totalAmount: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  depositText: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 12,
  },
  actionBtnGreen: { backgroundColor: Colors.successLight },
  actionBtnBlue: { backgroundColor: Colors.infoLight },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 12 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
