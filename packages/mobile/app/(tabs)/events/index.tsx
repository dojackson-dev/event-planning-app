import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/lib/theme';
import { MOCK_EVENTS } from '@/lib/mockData';
import { EVENT_CATEGORIES, CATEGORY_ICONS } from '@/lib/constants';
import EventCard from '@/components/EventCard';
import EmptyState from '@/components/EmptyState';
import { Event } from '@/types/event';

export default function EventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || '');
  const [favorites, setFavorites] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let result: Event[] = MOCK_EVENTS;
    if (selectedCategory) {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venueName?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, selectedCategory]);

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <View style={styles.container}>
      {/* Search bar */}
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
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={['', ...EVENT_CATEGORIES]}
        keyExtractor={(item) => item || 'all'}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, selectedCategory === item && styles.chipActive]}
            onPress={() => setSelectedCategory(item)}
          >
            {item ? (
              <Ionicons
                name={(CATEGORY_ICONS[item] as any) || 'grid'}
                size={13}
                color={selectedCategory === item ? '#fff' : Colors.primary}
              />
            ) : null}
            <Text style={[styles.chipText, selectedCategory === item && styles.chipTextActive]}>
              {item || 'All'}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            horizontal
            onPress={() =>
              router.push({ pathname: '/events/[eventId]', params: { eventId: item.id } })
            }
            onFavorite={() => toggleFavorite(item.id)}
            isFavorited={favorites.includes(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="No events found"
            message="Try a different search or category"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  chips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
});
