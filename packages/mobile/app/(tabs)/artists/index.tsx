import { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput, TouchableOpacity, Keyboard, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import ArtistCard, { Artist } from '@/components/ArtistCard';
import LoadingState from '@/components/LoadingState';
import NetChips from '@/components/NetChips';
import { toList } from '@/components/netFormat';

// Same filters as web dashboard/artists (GET /artists/search).
const ARTIST_TYPES = [
  { value: '', label: 'All' },
  { value: 'musician', label: 'Musician / Band' },
  { value: 'dj', label: 'DJ' },
  { value: 'comedian', label: 'Comedian' },
  { value: 'dancer', label: 'Dancer' },
  { value: 'magician', label: 'Magician' },
  { value: 'spoken_word', label: 'Spoken Word' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'other', label: 'Other' },
];

const TRAVEL = [
  { value: '', label: 'Any range' },
  { value: 'Local', label: 'Local' },
  { value: 'Regional', label: 'Regional+' },
  { value: 'National', label: 'National+' },
  { value: 'International', label: 'International' },
];

export default function ArtistDirectoryScreen() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [travel, setTravel] = useState('');
  const [location, setLocation] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [query, setQuery] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (f: { type: string; travel: string; location: string; availableOnly: boolean }) => {
    const mine = ++seq.current;
    setError('');
    try {
      const params: string[] = [];
      if (f.type) params.push(`artistType=${encodeURIComponent(f.type)}`);
      if (f.location) params.push(`location=${encodeURIComponent(f.location)}`);
      if (f.availableOnly) params.push('availableForBooking=true');
      if (f.travel) params.push(`travelAvailability=${encodeURIComponent(f.travel)}`);
      const data = await apiRequest<any>(`/artists/search${params.length ? `?${params.join('&')}` : ''}`);
      if (mine === seq.current) setArtists(toList<Artist>(data, 'artists'));
    } catch (err: any) {
      if (mine === seq.current) setError(err.message || 'Failed to load artists.');
    } finally {
      if (mine === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const filters = { type, travel, location: location.trim(), availableOnly };
  useFocusEffect(useCallback(() => { load(filters); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (patch: Partial<typeof filters>) => {
    setLoading(true);
    load({ ...filters, ...patch });
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? artists.filter((a) =>
        [a.artist_name, a.stage_name, a.artist_type, a.location, ...(a.genres || [])].some((x) => (x || '').toLowerCase().includes(q)))
    : artists;

  const header = (
    <View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Search by name or genre" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
      </View>
      <View style={styles.zipRow}>
        <View style={[styles.searchRow, { flex: 1 }]}>
          <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Location (city, state)"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => { Keyboard.dismiss(); apply({ location: location.trim() }); }}
          />
        </View>
        <TouchableOpacity style={styles.goBtn} onPress={() => { Keyboard.dismiss(); apply({ location: location.trim() }); }}>
          <Text style={styles.goText}>Search</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipBleed}>
        <NetChips value={type} onChange={(v) => { setType(v); apply({ type: v }); }} options={ARTIST_TYPES} />
      </View>
      <View style={styles.chipBleed}>
        <NetChips value={travel} onChange={(v) => { setTravel(v); apply({ travel: v }); }} options={TRAVEL} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Available for booking only</Text>
        <Switch value={availableOnly} onValueChange={(v) => { setAvailableOnly(v); apply({ availableOnly: v }); }} trackColor={{ true: Colors.primary, false: Colors.border }} />
      </View>
    </View>
  );

  if (loading && artists.length === 0 && !error) return <LoadingState message="Finding artists..." />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visible}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(filters); }} tintColor={Colors.primary} />}
      renderItem={({ item }) => <ArtistCard artist={item} onPress={() => router.push(`/(tabs)/artists/${item.id}` as any)} />}
      ListEmptyComponent={
        loading ? (
          <LoadingState message="Searching..." />
        ) : (
          <View style={styles.empty}>
            <Ionicons name={error ? 'alert-circle-outline' : 'mic-outline'} size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : 'No artists found'}</Text>
            <Text style={styles.emptyText}>{error || 'Try different filters or a broader location.'}</Text>
            {!!error && <TouchableOpacity style={styles.goBtn} onPress={() => apply({})}><Text style={styles.goText}>Retry</Text></TouchableOpacity>}
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  zipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  goBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  goText: { color: Colors.textWhite, fontWeight: '700', fontSize: 13 },
  chipBleed: { marginHorizontal: -16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, marginBottom: 8 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
