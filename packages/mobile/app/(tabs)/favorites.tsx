import { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MOCK_EVENTS } from '@/lib/mockData';
import { Colors } from '@/lib/theme';
import EventCard from '@/components/EventCard';
import EmptyState from '@/components/EmptyState';

export default function FavoritesScreen() {
  const router = useRouter();
  // In milestone 3, these will be fetched from Supabase
  const [favorites] = useState<string[]>([]);

  const favoriteEvents = MOCK_EVENTS.filter((e) => favorites.includes(e.id));

  return (
    <View style={styles.container}>
      {favoriteEvents.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No saved events yet"
          message="Tap the heart on any event to save it here"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={favoriteEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              horizontal
              onPress={() =>
                router.push({ pathname: '/events/[eventId]', params: { eventId: item.id } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
});
