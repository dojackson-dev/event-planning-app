import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import VenueCard from '@/components/VenueCard';
import { Venue } from '@/types/venue';

// Raw shape returned by GET /vendors/public (snake_case, per venues table).
interface RawVenue {
  id: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  address?: string;
  city?: string;
  state?: string;
}

export default function GuestVenuesScreen() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiRequest<any>('/vendors/public');
      const list: RawVenue[] = Array.isArray(data) ? [] : (data?.venues || []);
      const mapped: Venue[] = list.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        imageUrl: v.profile_image_url,
        address: v.address,
        city: v.city,
        state: v.state,
      }));
      setVenues(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load venues.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const promptLogin = () => {
    Alert.alert('Log in required', 'Log in to view venue details.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log In', onPress: () => router.push('/(auth)/login') },
    ]);
  };

  if (loading) return <LoadingState message="Loading venues..." />;

  if (error && venues.length === 0) {
    return <EmptyState icon="alert-circle-outline" title="Couldn't load venues" message={error} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState icon="business-outline" title="No venues yet" message="Check back soon for local venues." />}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <VenueCard venue={item} onPress={promptLogin} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  cardWrap: { marginBottom: 10 },
});
