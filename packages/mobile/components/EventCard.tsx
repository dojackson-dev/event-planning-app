import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@/types/event';
import { Colors, Radius, Shadow } from '@/lib/theme';

type EventCardProps = {
  event: Event;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  horizontal?: boolean;
};

export default function EventCard({ event, onPress, onFavorite, isFavorited = false, horizontal = false }: EventCardProps) {
  const dateLabel = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = new Date(event.startDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const priceLabel = event.isFree
    ? 'Free'
    : event.priceMin
    ? `From $${event.priceMin}`
    : 'Tickets Available';

  return (
    <TouchableOpacity
      style={[styles.card, horizontal && styles.cardHorizontal, Shadow.md]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageWrapper, horizontal && styles.imageWrapperHorizontal]}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={32} color={Colors.textMuted} />
          </View>
        )}
        {event.hasVip && (
          <View style={styles.vipBadge}>
            <Text style={styles.vipText}>VIP</Text>
          </View>
        )}
        {event.source === 'ticketmaster' && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>Ticketmaster</Text>
          </View>
        )}
        {onFavorite && (
          <TouchableOpacity style={styles.heartBtn} onPress={onFavorite}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorited ? '#EF4444' : Colors.textWhite}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.category}>{event.category}</Text>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.meta}>{dateLabel} · {timeLabel}</Text>
        </View>
        {event.venueName && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>{event.venueName}{event.city ? `, ${event.city}` : ''}</Text>
          </View>
        )}
        <Text style={[styles.price, event.isFree && styles.priceFree]}>{priceLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    width: 220,
    marginRight: 12,
  },
  cardHorizontal: {
    width: '100%',
    flexDirection: 'row',
    marginRight: 0,
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  imageWrapperHorizontal: {
    width: 100,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: 130,
  },
  imagePlaceholder: {
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  vipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
  sourceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#026CDF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textWhite,
    letterSpacing: 0.3,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: Radius.full,
    padding: 6,
  },
  info: {
    padding: 12,
    flex: 1,
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  priceFree: {
    color: Colors.success,
  },
});
