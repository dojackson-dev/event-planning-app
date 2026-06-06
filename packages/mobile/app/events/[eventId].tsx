import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { MOCK_EVENTS } from '@/lib/mockData';
import AppButton from '@/components/AppButton';

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const event = MOCK_EVENTS.find((e) => e.id === eventId);

  if (!event) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dateLabel = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeLabel = new Date(event.startDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  const priceLabel = event.isFree
    ? 'Free'
    : event.priceMin
    ? `From $${event.priceMin}${event.priceMax ? ` – $${event.priceMax}` : ''}`
    : 'Tickets Available';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero image */}
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Ionicons name="musical-notes" size={48} color={Colors.textMuted} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          {event.hasVip && (
            <View style={styles.vipBadge}>
              <Text style={styles.vipText}>VIP Available</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{event.title}</Text>

        {/* Date & Time */}
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.infoLabel}>{dateLabel}</Text>
            <Text style={styles.infoSub}>{timeLabel}</Text>
          </View>
        </View>

        {/* Venue */}
        {event.venueName && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{event.venueName}</Text>
              {event.address && (
                <Text style={styles.infoSub}>
                  {event.address}{event.city ? `, ${event.city}` : ''}{event.state ? `, ${event.state}` : ''}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Price */}
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="pricetag" size={18} color={Colors.primary} />
          </View>
          <Text style={[styles.infoLabel, event.isFree && { color: Colors.success }]}>
            {priceLabel}
          </Text>
        </View>
      </View>

      {/* Description */}
      {event.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>
      )}

      {/* Ticket options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tickets</Text>
        <View style={[styles.ticketOption, Shadow.sm]}>
          <View>
            <Text style={styles.ticketName}>General Admission</Text>
            <Text style={styles.ticketPrice}>
              {event.isFree ? 'Free' : event.priceMin ? `$${event.priceMin}` : 'TBD'}
            </Text>
          </View>
          <AppButton
            title="Select"
            variant="outline"
            style={styles.selectBtn}
            onPress={() => Alert.alert('Coming Soon', 'Checkout will be available soon.')}
          />
        </View>
        {event.hasVip && (
          <View style={[styles.ticketOption, styles.vipOption, Shadow.sm]}>
            <View>
              <Text style={styles.ticketName}>VIP Package</Text>
              <Text style={styles.ticketPrice}>
                {event.priceMax ? `From $${event.priceMax}` : 'Contact for pricing'}
              </Text>
            </View>
            <AppButton
              title="Select"
              variant="outline"
              style={styles.selectBtn}
              onPress={() => Alert.alert('Coming Soon', 'VIP checkout will be available soon.')}
            />
          </View>
        )}
      </View>

      {/* CTA */}
      <View style={styles.ctaArea}>
        <AppButton
          title="Continue to Checkout"
          onPress={() => Alert.alert('Coming Soon', 'Payment processing is coming soon!')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: Colors.textSecondary },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  hero: { width: '100%', height: 260 },
  heroPlaceholder: { backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  categoryText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  vipBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  vipText: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3, lineHeight: 28 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  infoSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  ticketOption: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vipOption: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
  ticketName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  ticketPrice: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginTop: 2 },
  selectBtn: { minHeight: 36, paddingVertical: 8, paddingHorizontal: 16 },
  ctaArea: { paddingHorizontal: 20, paddingTop: 24 },
});
