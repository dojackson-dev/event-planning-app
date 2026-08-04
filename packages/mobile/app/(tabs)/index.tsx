import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { MOCK_EVENTS, MOCK_VENUES } from '@/lib/mockData';
import { EVENT_CATEGORIES, CATEGORY_ICONS } from '@/lib/constants';
import EventCard from '@/components/EventCard';
import VenueCard from '@/components/VenueCard';
import SectionHeader from '@/components/SectionHeader';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const featuredEvents = MOCK_EVENTS.slice(0, 4);
  const tonightEvents = MOCK_EVENTS.filter((e) => {
    const diff = new Date(e.startDate).getTime() - Date.now();
    return diff > 0 && diff < 2 * 24 * 60 * 60 * 1000;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Hero greeting */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroGreeting}>Good evening ðŸ‘‹</Text>
          <Text style={styles.heroTitle}>What's happening?</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/events')}>
          <Ionicons name="search" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {EVENT_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={styles.chip}
            onPress={() => router.push({ pathname: '/(tabs)/events', params: { category: cat } })}
          >
            <Ionicons name={(CATEGORY_ICONS[cat] as any) || 'grid'} size={14} color={Colors.primary} />
            <Text style={styles.chipText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tonight / This Weekend */}
      {tonightEvents.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Tonight"
            subtitle="Don't miss these"
            action={{ label: 'See all', onPress: () => router.push('/(tabs)/events') }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {tonightEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId: event.id } })}
                onFavorite={() => toggleFavorite(event.id)}
                isFavorited={favorites.includes(event.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured Events */}
      <View style={styles.section}>
        <SectionHeader
          title="Featured Events"
          action={{ label: 'See all', onPress: () => router.push('/(tabs)/events') }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {featuredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId: event.id } })}
              onFavorite={() => toggleFavorite(event.id)}
              isFavorited={favorites.includes(event.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Featured Venues */}
      <View style={styles.section}>
        <SectionHeader title="Popular Venues" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {MOCK_VENUES.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onPress={() => router.push({ pathname: '/venues/[venueId]', params: { venueId: venue.id } })}
            />
          ))}
        </ScrollView>
      </View>

      {/* CTA Banner */}
      <TouchableOpacity style={[styles.ctaBanner, Shadow.md]} onPress={() => router.push('/(tabs)/tickets')}>
        <View>
          <Text style={styles.ctaTitle}>Your Tickets</Text>
          <Text style={styles.ctaSubtitle}>View your upcoming events</Text>
        </View>
        <Ionicons name="ticket" size={28} color={Colors.textWhite} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroGreeting: { fontSize: 14, color: Colors.textSecondary },
  heroTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  searchBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  chips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  section: { marginTop: 20 },
  hScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  ctaBanner: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTitle: { fontSize: 17, fontWeight: '700', color: Colors.textWhite },
  ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
});
