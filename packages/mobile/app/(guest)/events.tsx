import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import EventCard from '@/components/EventCard';
import { Event } from '@/types/event';

// Raw shape returned by GET /promoter-events/public (snake_case, public_events table row).
interface RawTicketTier {
  price: number;
}
interface RawPublicEvent {
  id: string;
  title: string;
  event_date: string;
  start_time?: string | null;
  venue_name?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  image_url?: string | null;
  ticket_tiers?: RawTicketTier[];
}

// Raw shape returned by GET /ticketmaster/events.
interface RawTicketmasterEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  image_url: string | null;
  category: string | null;
  min_price: number | null;
  ticketmaster_url: string;
}

// Raw shape returned by GET /external-events/events (aggregated RSS/ICS/XML/CSV/REST sources).
interface RawExternalEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  image_url: string | null;
  category: string | null;
  price_min: number | null;
  event_url: string | null;
}

function mapEvent(e: RawPublicEvent): Event {
  const prices = (e.ticket_tiers || []).map((t) => t.price).filter((p) => typeof p === 'number');
  const priceMin = prices.length ? Math.min(...prices) : undefined;
  return {
    id: e.id,
    title: e.title,
    category: e.category || 'Event',
    imageUrl: e.image_url || undefined,
    startDate: e.start_time ? `${e.event_date}T${e.start_time}` : e.event_date,
    venueName: e.venue_name || undefined,
    city: e.city || undefined,
    state: e.state || undefined,
    priceMin,
    isFree: prices.length > 0 && priceMin === 0,
    source: 'platform',
  };
}

function mapTicketmasterEvent(e: RawTicketmasterEvent): Event {
  return {
    id: e.id,
    title: e.title,
    category: e.category || 'Event',
    imageUrl: e.image_url || undefined,
    startDate: e.start_time ? `${e.event_date}T${e.start_time}` : e.event_date,
    venueName: e.venue_name || undefined,
    city: e.city || undefined,
    state: e.state || undefined,
    priceMin: e.min_price ?? undefined,
    isFree: e.min_price === 0,
    source: 'ticketmaster',
    externalUrl: e.ticketmaster_url,
  };
}

function mapExternalEvent(e: RawExternalEvent): Event {
  return {
    id: e.id,
    title: e.title,
    category: e.category || 'Event',
    imageUrl: e.image_url || undefined,
    startDate: e.start_time ? `${e.event_date}T${e.start_time}` : e.event_date,
    venueName: e.venue_name || undefined,
    city: e.city || undefined,
    state: e.state || undefined,
    priceMin: e.price_min ?? undefined,
    isFree: e.price_min === 0,
    source: 'external',
    externalUrl: e.event_url || undefined,
  };
}

export default function GuestEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [zipCode, setZipCode] = useState('');

  const load = useCallback(async (zip?: string) => {
    setError('');
    const trimmedZip = zip?.trim();
    const qs = trimmedZip ? `?zip_code=${encodeURIComponent(trimmedZip)}&radius_miles=30` : '';
    const [platformResult, tmResult, extResult] = await Promise.allSettled([
      apiRequest<RawPublicEvent[]>(`/promoter-events/public${qs}`),
      apiRequest<RawTicketmasterEvent[]>(`/ticketmaster/events${qs}`),
      apiRequest<RawExternalEvent[]>(`/external-events/events${qs}`),
    ]);

    const platformEvents = platformResult.status === 'fulfilled' ? (platformResult.value || []).map(mapEvent) : [];
    const tmEvents = tmResult.status === 'fulfilled' ? (tmResult.value || []).map(mapTicketmasterEvent) : [];
    const extEvents = extResult.status === 'fulfilled' ? (extResult.value || []).map(mapExternalEvent) : [];

    setEvents([...platformEvents, ...extEvents, ...tmEvents]);
    if (platformResult.status === 'rejected' && tmResult.status === 'rejected' && extResult.status === 'rejected') {
      setError('Failed to load events');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(zipCode); }, [load]));

  const handleZipSearch = () => {
    setLoading(true);
    load(zipCode);
  };

  const onRefresh = () => { setRefreshing(true); load(zipCode); };

  const promptLogin = () => {
    Alert.alert('Log in required', 'Log in to view event details and buy tickets.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log In', onPress: () => router.push('/(auth)/login') },
    ]);
  };

  const handlePress = (item: Event) => {
    if ((item.source === 'ticketmaster' || item.source === 'external') && item.externalUrl) {
      Linking.openURL(item.externalUrl);
    } else {
      promptLogin();
    }
  };

  const q = search.trim().toLowerCase();
  const filteredEvents = q
    ? events.filter((e) => {
        const title = e.title.toLowerCase();
        const venue = (e.venueName || '').toLowerCase();
        const city = (e.city || '').toLowerCase();
        const category = e.category.toLowerCase();
        return title.includes(q) || venue.includes(q) || city.includes(q) || category.includes(q);
      })
    : events;

  if (loading) return <LoadingState message="Loading events..." />;

  if (error && events.length === 0) {
    return <EmptyState icon="alert-circle-outline" title="Couldn't load events" message={error} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, cities..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Ionicons
              name="close-circle"
              size={16}
              color={Colors.textMuted}
              onPress={() => setSearch('')}
            />
          )}
        </View>
        <View style={styles.zipBox}>
          <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.zipInput}
            placeholder="Zip code"
            placeholderTextColor={Colors.textMuted}
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="number-pad"
            maxLength={10}
            returnKeyType="search"
            onSubmitEditing={handleZipSearch}
          />
        </View>
        <Ionicons
          name="arrow-forward-circle"
          size={28}
          color={Colors.primary}
          onPress={handleZipSearch}
        />
      </View>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No events found" message="Try adjusting your search or check back soon." />}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => handlePress(item)} horizontal />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  zipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: 100,
  },
  zipInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
});
