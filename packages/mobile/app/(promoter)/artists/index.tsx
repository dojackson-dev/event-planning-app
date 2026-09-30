import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import ArtistCard, { Artist } from '@/components/ArtistCard';
import EmptyState from '@/components/EmptyState';

export default function ArtistsDirectoryScreen() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<Artist[]>('/artists/search');
      setArtists(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load artists');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? artists.filter((a) => {
        const name = (a.stage_name || a.artist_name || '').toLowerCase();
        const type = (a.artist_type || '').toLowerCase();
        const loc = (a.location || '').toLowerCase();
        const genres = (a.genres || []).join(' ').toLowerCase();
        return name.includes(q) || type.includes(q) || loc.includes(q) || genres.includes(q);
      })
    : artists;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists, genres, cities..."
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
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
        renderItem={({ item }) => (
          <ArtistCard artist={item} onPress={() => router.push(`/(promoter)/artists/${item.id}` as any)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="mic-outline"
            title="No artists found"
            message="Try adjusting your search or check back later."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  list: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
});
