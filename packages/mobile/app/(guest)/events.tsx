import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
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

export default function GuestEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const [platformResult, tmResult] = await Promise.allSettled([
      apiRequest<RawPublicEvent[]>('/promoter-events/public'),
      apiRequest<RawTicketmasterEvent[]>('/ticketmaster/events'),
    ]);

    const platformEvents = platformResult.status === 'fulfilled' ? (platformResult.value || []).map(mapEvent) : [];
    const tmEvents = tmResult.status === 'fulfilled' ? (tmResult.value || []).map(mapTicketmasterEvent) : [];

    setEvents([...platformEvents, ...tmEvents]);
    if (platformResult.status === 'rejected' && tmResult.status === 'rejected') {
      setError('Failed to load events');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const promptLogin = () => {
    Alert.alert('Log in required', 'Log in to view event details and buy tickets.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log In', onPress: () => router.push('/(auth)/login') },
    ]);
  };

  const handlePress = (item: Event) => {
    if (item.source === 'ticketmaster' && item.externalUrl) {
      Linking.openURL(item.externalUrl);
    } else {
      promptLogin();
    }
  };

  if (loading) return <LoadingState message="Loading events..." />;

  if (error && events.length === 0) {
    return <EmptyState icon="alert-circle-outline" title="Couldn't load events" message={error} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No events yet" message="Check back soon for upcoming events." />}
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
});
