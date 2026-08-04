import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { MOCK_TICKETS } from '@/lib/mockData';
import AppButton from '@/components/AppButton';

// Minimal inline QR placeholder — no external dep needed
function QRPlaceholder({ value }: { value: string }) {
  return (
    <View style={qrStyles.container}>
      <View style={qrStyles.inner}>
        <Ionicons name="qr-code" size={120} color={Colors.textPrimary} />
      </View>
      <Text style={qrStyles.code}>{value}</Text>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, backgroundColor: Colors.surface, borderRadius: Radius.xl, ...Shadow.sm },
  inner: { padding: 16, backgroundColor: '#fff', borderRadius: Radius.lg },
  code: { marginTop: 12, fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace' },
});

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);

  if (!ticket) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Ticket not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dateLabel = new Date(ticket.eventDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeLabel = new Date(ticket.eventDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const STATUS_COLOR: Record<string, string> = {
    active: Colors.success,
    used: Colors.textMuted,
    cancelled: Colors.error,
    expired: Colors.textMuted,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: STATUS_COLOR[ticket.status] }]}>
        <Ionicons
          name={ticket.status === 'active' ? 'checkmark-circle' : 'alert-circle'}
          size={18}
          color="#fff"
        />
        <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
      </View>

      {/* Event info card */}
      <View style={[styles.card, Shadow.sm]}>
        {ticket.isVip && (
          <View style={styles.vipRow}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <Text style={styles.vipLabel}>VIP Ticket</Text>
          </View>
        )}
        <Text style={styles.eventTitle}>{ticket.eventTitle}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.infoText}>{dateLabel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.infoText}>{timeLabel}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{ticket.ticketType}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Qty</Text>
            <Text style={styles.detailValue}>{ticket.quantity}</Text>
          </View>
        </View>
      </View>

      {/* QR Code */}
      {ticket.status === 'active' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <Text style={styles.sectionSub}>Show this at entry. One scan per admission.</Text>
          <QRPlaceholder value={ticket.qrCodeValue} />
        </View>
      )}

      {/* Actions */}
      {ticket.status === 'active' && (
        <View style={styles.actions}>
          <AppButton
            title="Share Ticket"
            variant="outline"
            onPress={() => Alert.alert('Share', 'Sharing coming soon!')}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, color: Colors.textSecondary },
  back: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 10,
  },
  vipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vipLabel: { fontSize: 12, fontWeight: '700', color: Colors.warning },
  eventTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  detailRow: { flexDirection: 'row', gap: 24 },
  detailItem: { gap: 2 },
  detailLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  section: { paddingHorizontal: 16, paddingTop: 24, gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  sectionSub: { fontSize: 13, color: Colors.textSecondary },
  actions: { paddingHorizontal: 16, paddingTop: 24, gap: 10 },
});
