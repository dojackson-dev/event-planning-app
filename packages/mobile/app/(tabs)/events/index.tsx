import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import EvtErrorState from '@/components/EvtErrorState';
import EvtProgressBar from '@/components/EvtProgressBar';
import {
  EvtEvent, normalizeEvent, eventTitle, computeProgress, parseLocalDate, formatDate, formatTimeRange, todayKey,
} from '@/components/EvtDate';

interface OwnerVenue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
}

type Filter = 'all' | 'upcoming' | 'past';

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EvtEvent[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [venues, setVenues] = useState<OwnerVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [venueId, setVenueId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [ev, est, inv, con, ven] = await Promise.all([
        apiRequest<any[]>('/events'),
        apiRequest<any[]>('/estimates').catch(() => []),
        apiRequest<any[]>('/invoices').catch(() => []),
        apiRequest<any[]>('/contracts').catch(() => []),
        apiRequest<{ venues: OwnerVenue[] }>('/owner/venues').catch(() => ({ venues: [] })),
      ]);
      setEvents((Array.isArray(ev) ? ev : []).map(normalizeEvent));
      setEstimates(Array.isArray(est) ? est : []);
      setInvoices(Array.isArray(inv) ? inv : []);
      setContracts(Array.isArray(con) ? con : []);
      setVenues(ven?.venues || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const activeVenue = venues.find((v) => v.id === venueId) || null;

  const visible = useMemo(() => {
    const today = todayKey();
    const q = search.trim().toLowerCase();
    const list = events.filter((e) => {
      const day = (e.date || '').slice(0, 10);
      if (filter === 'upcoming' && day < today) return false;
      if (filter === 'past' && day >= today) return false;
      if (activeVenue) {
        // Legacy rows store the venue name in venue_id instead of the UUID.
        const matches = e.venueId === activeVenue.id || e.venueId === activeVenue.name || e.venue === activeVenue.name;
        if (!matches) return false;
      }
      if (q) {
        return (
          (e.name || '').toLowerCase().includes(q) ||
          (e.intakeEventName || '').toLowerCase().includes(q) ||
          (e.clientName || '').toLowerCase().includes(q) ||
          (e.venue || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    // Upcoming first (soonest first), then past (most recent first) — same as web.
    return list.sort((a, b) => {
      const da = (a.date || '').slice(0, 10);
      const db = (b.date || '').slice(0, 10);
      const aUp = da >= today;
      const bUp = db >= today;
      if (aUp && bUp) return da.localeCompare(db);
      if (!aUp && !bUp) return db.localeCompare(da);
      return aUp ? -1 : 1;
    });
  }, [events, filter, search, activeVenue]);

  const venueAddress = (e: EvtEvent) => {
    const v = venues.find((x) => x.id === e.venueId || x.name === e.venueId || x.name === e.venue);
    const parts = v ? [v.address, v.city, v.state].filter(Boolean) : [];
    return parts.length ? parts.join(', ') : e.location || e.venue || '';
  };

  const header = (
    <Stack.Screen
      options={{
        title: 'Events',
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/(tabs)/events/new' as any)} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (loading) return <>{header}<LoadingState message="Loading events…" /></>;
  if (error && events.length === 0) {
    return <>{header}<EvtErrorState title="Couldn't load events" message={error} onRetry={() => { setLoading(true); load(); }} /></>;
  }

  return (
    <View style={styles.container}>
      {header}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by client, event, venue…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'upcoming', 'past'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All Events' : f === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {venues.length > 1 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueRow}>
            <TouchableOpacity style={[styles.chip, !venueId && styles.chipActive]} onPress={() => setVenueId(null)}>
              <Text style={[styles.chipText, !venueId && styles.chipTextActive]}>All Venues</Text>
            </TouchableOpacity>
            {venues.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.chip, venueId === v.id && styles.chipActive]}
                onPress={() => setVenueId(v.id)}
              >
                <Text style={[styles.chipText, venueId === v.id && styles.chipTextActive]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const steps = computeProgress(item, estimates, invoices, contracts);
          const isComplete = steps.every((s) => s.done || s.skipped);
          const currentIdx = steps.findIndex((s) => !s.done && !s.skipped);
          const badge = isComplete ? '✓ Booked' : currentIdx === 0 ? 'New' : `Step ${currentIdx + 1}/5`;
          const addr = venueAddress(item);
          const time = formatTimeRange(item.startTime, item.endTime);
          const stripe = isComplete ? Colors.success : item.status === 'completed' ? Colors.textMuted : Colors.primary;
          return (
            <TouchableOpacity
              style={[styles.card, Shadow.sm]}
              activeOpacity={0.8}
              onPress={() => router.push(`/(tabs)/events/${item.id}` as any)}
            >
              <View style={[styles.stripe, { backgroundColor: stripe }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    {item.clientName ? <Text style={styles.client} numberOfLines={1}>{item.clientName}</Text> : null}
                    <Text style={styles.title} numberOfLines={2}>{eventTitle(item)}</Text>
                  </View>
                  <View style={[styles.badge, isComplete ? styles.badgeDone : currentIdx === 0 ? styles.badgeNew : styles.badgeStep]}>
                    <Text style={[styles.badgeText, isComplete ? { color: Colors.successText } : currentIdx === 0 ? { color: Colors.textSecondary } : { color: Colors.primaryText }]}>
                      {badge}
                    </Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    {parseLocalDate(item.date) ? formatDate(item.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                  </Text>
                </View>
                {addr ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>{addr}</Text>
                  </View>
                ) : null}
                {item.maxGuests ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>Up to {item.maxGuests} guests</Text>
                  </View>
                ) : null}
                {time ? <Text style={styles.timeText}>{time}</Text> : null}
                <View style={styles.progressWrap}>
                  <EvtProgressBar steps={steps} size="sm" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No events found"
            message={search || venueId || filter !== 'all' ? 'Try changing your search or filters.' : 'Submit a client intake form or create an event to get started.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 12, backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  venueRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: Colors.errorLight, paddingHorizontal: 16, paddingVertical: 8,
  },
  errorText: { fontSize: 13, color: Colors.errorText, flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
  },
  stripe: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  client: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeDone: { backgroundColor: Colors.successLight },
  badgeNew: { backgroundColor: Colors.borderLight },
  badgeStep: { backgroundColor: Colors.primaryLight },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  timeText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  progressWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
