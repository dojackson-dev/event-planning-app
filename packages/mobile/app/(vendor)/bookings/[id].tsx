import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface VendorInvoiceSummary {
  id: string;
  status: string;
  total_amount: number;
  amount_paid: number;
}

interface VendorBooking {
  id: string;
  event_name: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  notes?: string | null;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'paid';
  agreed_amount?: number | null;
  deposit_amount?: number | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  vendorInvoices?: VendorInvoiceSummary[];
}

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  pending:   { label: 'Pending',   bg: Colors.warningLight, fg: Colors.warningText },
  confirmed: { label: 'Confirmed', bg: Colors.successLight, fg: Colors.successText },
  declined:  { label: 'Declined',  bg: Colors.errorLight,   fg: Colors.errorText },
  cancelled: { label: 'Cancelled', bg: Colors.borderLight,  fg: Colors.textSecondary },
  completed: { label: 'Completed', bg: Colors.infoLight,    fg: Colors.infoText },
  paid:      { label: 'Paid',      bg: Colors.purpleLight,  fg: Colors.purpleText },
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled',
};

const formatDate = (d?: string | null) => {
  if (!d) return '';
  return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
};

const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function VendorBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<VendorBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<VendorBooking[]>('/vendors/bookings/mine');
      const found = (data || []).find((b) => b.id === id);
      if (!found) {
        setError('Booking not found');
      } else {
        setBooking(found);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (status: 'confirmed' | 'declined' | 'cancelled' | 'completed') => {
    if (!booking) return;
    setUpdating(true);
    try {
      const updated = await apiRequest<VendorBooking>(`/vendors/bookings/${booking.id}`, {
        method: 'PUT',
        body: { status },
      });
      setBooking(updated);
    } catch (err: any) {
      Alert.alert('Update failed', err?.message || 'Could not update booking status.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmCancel = () => {
    if (!booking) return;
    Alert.alert(
      'Cancel booking?',
      'This will mark the booking as cancelled. This cannot be undone from here.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: () => updateStatus('cancelled') },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <>
        <Stack.Screen options={{ title: 'Booking' }} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  const primaryInvoice = booking.vendorInvoices?.[0];

  return (
    <>
      <Stack.Screen options={{ title: booking.event_name || 'Booking' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={[styles.headerCard, Shadow.sm]}>
          <View style={styles.headerTop}>
            <Text style={styles.eventName}>{booking.event_name || 'Untitled Event'}</Text>
            <View style={[styles.pill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.pillText, { color: meta.fg }]}>{meta.label}</Text>
            </View>
          </View>
          <View style={styles.headerRow}>
            <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.headerMeta}>{formatDate(booking.event_date)}</Text>
          </View>
          {(booking.start_time || booking.end_time) ? (
            <View style={styles.headerRow}>
              <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.headerMeta}>
                {booking.start_time || ''}{booking.end_time ? ` – ${booking.end_time}` : ''}
              </Text>
            </View>
          ) : null}
          {booking.venue_name ? (
            <View style={styles.headerRow}>
              <Ionicons name="location-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.headerMeta}>{booking.venue_name}</Text>
            </View>
          ) : null}
          {booking.venue_address ? (
            <Text style={styles.venueAddress}>{booking.venue_address}</Text>
          ) : null}
        </View>

        {/* Client contact */}
        {(booking.client_name || booking.client_email || booking.client_phone) ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Client</Text>
            <View style={[styles.card, Shadow.sm]}>
              {booking.client_name ? (
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                  <Text style={styles.infoValue}>{booking.client_name}</Text>
                </View>
              ) : null}
              {booking.client_email ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${booking.client_email}`)}>
                  <Ionicons name="mail-outline" size={16} color={Colors.textMuted} />
                  <Text style={[styles.infoValue, styles.linkText]}>{booking.client_email}</Text>
                </TouchableOpacity>
              ) : null}
              {booking.client_phone ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${booking.client_phone}`)}>
                  <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
                  <Text style={[styles.infoValue, styles.linkText]}>{booking.client_phone}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Financial terms */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Financial Terms</Text>
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.infoRowBetween}>
              <Text style={styles.infoLabel}>Agreed Amount</Text>
              <Text style={styles.infoValueStrong}>{fmtMoney(booking.agreed_amount)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRowBetween}>
              <Text style={styles.infoLabel}>Deposit</Text>
              <Text style={styles.infoValueStrong}>{fmtMoney(booking.deposit_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Linked invoice */}
        {primaryInvoice ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Invoice</Text>
            <View style={[styles.card, Shadow.sm]}>
              <View style={styles.infoRowBetween}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValueStrong}>{INVOICE_STATUS_LABEL[primaryInvoice.status] || primaryInvoice.status}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRowBetween}>
                <Text style={styles.infoLabel}>Total</Text>
                <Text style={styles.infoValueStrong}>{fmtMoney(primaryInvoice.total_amount)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRowBetween}>
                <Text style={styles.infoLabel}>Paid</Text>
                <Text style={styles.infoValueStrong}>{fmtMoney(primaryInvoice.amount_paid)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Notes */}
        {booking.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={[styles.card, Shadow.sm]}>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {booking.status === 'pending' ? (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn, updating && styles.actionBtnDisabled]}
                  disabled={updating}
                  onPress={() => updateStatus('confirmed')}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn, updating && styles.actionBtnDisabled]}
                  disabled={updating}
                  onPress={() => updateStatus('declined')}
                >
                  <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                  <Text style={[styles.actionBtnText, { color: Colors.error }]}>Decline</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {booking.status === 'confirmed' ? (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeBtn, updating && styles.actionBtnDisabled]}
                  disabled={updating}
                  onPress={() => updateStatus('completed')}
                >
                  <Ionicons name="checkmark-done-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Mark Completed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn, updating && styles.actionBtnDisabled]}
                  disabled={updating}
                  onPress={confirmCancel}
                >
                  <Ionicons name="ban-outline" size={16} color={Colors.error} />
                  <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {(booking.status === 'completed' || booking.status === 'declined' || booking.status === 'cancelled' || booking.status === 'paid') ? (
              <Text style={styles.noActionsText}>No further actions available for this booking.</Text>
            ) : null}
          </View>
          {updating ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 12 }} /> : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 24, backgroundColor: Colors.background },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  eventName: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 12, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerMeta: { fontSize: 13, color: Colors.textSecondary },
  venueAddress: { fontSize: 12, color: Colors.textMuted, marginTop: 4, marginLeft: 21 },

  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoValue: { fontSize: 14, color: Colors.textPrimary },
  linkText: { color: Colors.primary, fontWeight: '600' },
  infoRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValueStrong: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, fontStyle: 'italic' },

  actionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: Radius.lg, flexGrow: 1,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  confirmBtn: { backgroundColor: Colors.success },
  completeBtn: { backgroundColor: Colors.info },
  declineBtn: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.error },
  noActionsText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
});
