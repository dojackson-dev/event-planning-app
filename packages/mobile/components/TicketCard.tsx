import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ticket } from '@/types/ticket';
import { Colors, Radius, Shadow } from '@/lib/theme';

type TicketCardProps = {
  ticket: Ticket;
  onPress: () => void;
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: Colors.success, bg: Colors.successLight },
  used: { label: 'Used', color: Colors.textMuted, bg: Colors.borderLight },
  cancelled: { label: 'Cancelled', color: Colors.error, bg: Colors.errorLight },
  expired: { label: 'Expired', color: Colors.textMuted, bg: Colors.borderLight },
};

export default function TicketCard({ ticket, onPress }: TicketCardProps) {
  const dateLabel = new Date(ticket.eventDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = new Date(ticket.eventDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const { label, color, bg } = STATUS_CONFIG[ticket.status];

  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.leftAccent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {ticket.isVip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={1}>{ticket.eventTitle}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.meta}>{dateLabel} · {timeLabel}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.row}>
            <Ionicons name="ticket-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.meta}>{ticket.ticketType}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.meta}>x{ticket.quantity}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  leftAccent: {
    width: 5,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vipBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  vipText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
});
