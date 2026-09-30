import { View, Text, StyleSheet } from 'react-native';
import AppButton from './AppButton';
import { Colors, Radius, Shadow } from '@/lib/theme';
import type { VendorBookingRequest } from '@/types/vendorBooking';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: Colors.warningLight, color: Colors.warning, label: 'Pending' },
  confirmed: { bg: Colors.successLight, color: Colors.success, label: 'Confirmed' },
  declined: { bg: Colors.errorLight, color: Colors.error, label: 'Declined' },
  cancelled: { bg: Colors.errorLight, color: Colors.error, label: 'Cancelled' },
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  request: VendorBookingRequest;
  onAccept?: () => void;
  onDecline?: () => void;
  busy?: boolean;
}

export default function BookingRequestCard({ request, onAccept, onDecline, busy }: Props) {
  const s = STATUS_STYLES[request.status] || {
    bg: Colors.borderLight,
    color: Colors.textSecondary,
    label: request.status,
  };
  const isPending = request.status === 'pending';

  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.headerRow}>
        <Text style={styles.eventName} numberOfLines={1}>
          {request.event_name || 'Booking Request'}
        </Text>
        <View style={[styles.pill, { backgroundColor: s.bg }]}>
          <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      <Text style={styles.detailLine}>{formatDate(request.event_date)}</Text>
      <Text style={styles.detailLine}>{request.client_name}</Text>
      {request.venue_name && <Text style={styles.detailLine}>{request.venue_name}</Text>}
      {request.quoted_amount != null && (
        <Text style={styles.amount}>${Number(request.quoted_amount).toFixed(2)}</Text>
      )}
      {request.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {request.notes}
        </Text>
      )}

      {isPending && (onAccept || onDecline) && (
        <View style={styles.actionsRow}>
          {onDecline && (
            <View style={styles.actionBtn}>
              <AppButton title="Decline" variant="outline" onPress={onDecline} disabled={busy} />
            </View>
          )}
          {onAccept && (
            <View style={styles.actionBtn}>
              <AppButton title="Accept" onPress={onAccept} disabled={busy} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  eventName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  detailLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
  notes: { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
});
