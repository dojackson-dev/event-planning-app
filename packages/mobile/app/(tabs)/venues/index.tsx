import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import VenueCard from '@/components/VenueCard';
import { Venue } from '@/types/venue';

export interface OwnerVenue extends Venue {
  zip_code?: string;
  phone?: string;
  website?: string;
  capacity?: number;
}

export default function VenuesScreen() {
  const router = useRouter();
  const [venues, setVenues] = useState<OwnerVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchVenues = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<{ venues: OwnerVenue[] }>('/owner/venues');
      setVenues(data.venues || []);
    } catch (err: any) {
      console.error('Error fetching venues:', err.message);
      setError(err.message || 'Failed to load venues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchVenues(); }, [fetchVenues]));

  const onRefresh = () => { setRefreshing(true); fetchVenues(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error && venues.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchVenues}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{venues.length} {venues.length === 1 ? 'Venue' : 'Venues'}</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/venues/new' as any)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={venues}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <VenueCard
            venue={item}
            onPress={() => router.push(`/(tabs)/venues/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No venues yet</Text>
            <Text style={styles.emptyText}>Tap New to add your first venue</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/venues/new' as any)}>
              <Text style={styles.emptyBtnText}>Add Venue</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24, gap: 12 },
  errorText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryBtnText: { color: '#FFF', fontWeight: '600' },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    ...Shadow.sm,
  },
  newBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  content: { padding: 16, paddingBottom: 32 },
  row: { justifyContent: 'flex-start', gap: 12 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8, width: '100%' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
