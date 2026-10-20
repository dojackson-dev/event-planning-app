import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  request: VendorBookingRequest;
  onAccept?: (quotedAmount?: number) => void;
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
  const [quote, setQuote] = useState('');
  const time = [request.start_time, request.end_time].filter(Boolean).map((t) => String(t).slice(0, 5)).join(' – ');

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

      <Text style={styles.detailLine}>{formatDate(request.event_date)}{time ? ` · ${time}` : ''}</Text>
      <Text style={styles.detailLine}>{request.client_name}</Text>
      {(request.client_email || request.client_phone) && (
        <View style={styles.contactRow}>
          {!!request.client_phone && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${request.client_phone}`)}>
              <Ionicons name="call-outline" size={14} color={Colors.primary} />
              <Text style={styles.contactText}>{request.client_phone}</Text>
            </TouchableOpacity>
          )}
          {!!request.client_email && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${request.client_email}`)}>
              <Ionicons name="mail-outline" size={14} color={Colors.primary} />
              <Text style={styles.contactText} numberOfLines={1}>{request.client_email}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {request.venue_name && <Text style={styles.detailLine}>{request.venue_name}</Text>}
      {request.quoted_amount != null && (
        <Text style={styles.amount}>${Number(request.quoted_amount).toFixed(2)}</Text>
      )}
      {request.notes && (
        <Text style={styles.notes} numberOfLines={4}>
          {request.notes}
        </Text>
      )}

      {isPending && !!onAccept && (
        <TextInput
          style={styles.quoteInput}
          value={quote}
          onChangeText={setQuote}
          placeholder="Quote amount (optional)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />
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
              <AppButton
                title="Accept"
                onPress={() => {
                  const n = parseFloat(quote);
                  onAccept(Number.isFinite(n) && n >= 0 && quote.trim() ? n : undefined);
                }}
                disabled={busy}
              />
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
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  contactText: { fontSize: 13, color: Colors.primary, flexShrink: 1 },
  quoteInput: {
    marginTop: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
});
