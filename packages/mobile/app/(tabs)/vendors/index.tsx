import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { Vendor } from '@/types/vendor';
import VendorCard from '@/components/VendorCard';

// Raw shape returned by GET /vendors/public (snake_case, per vendor_accounts table).
// Mapped below into the mobile-shared `Vendor` type for use with <VendorCard />.
interface RawVendor {
  id: string;
  business_name?: string;
  name?: string;
  bio?: string;
  description?: string;
  profile_image_url?: string;
  imageUrl?: string;
  category: string;
  city?: string;
  state?: string;
}

export default function VendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiRequest<any>('/vendors/public');
      // API has been observed returning either a raw array or an
      // envelope object (e.g. { vendors: [...] }) — handle both defensively.
      const list: RawVendor[] = Array.isArray(data) ? data : (data?.vendors || []);
      const mapped: Vendor[] = list.map((v) => ({
        id: v.id,
        name: v.business_name || v.name || 'Vendor',
        description: v.bio || v.description,
        imageUrl: v.profile_image_url || v.imageUrl,
        category: v.category,
        city: v.city,
        state: v.state,
      }));
      setVendors(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.bookingsLink, Shadow.sm]}
        onPress={() => router.push('/(tabs)/vendors/bookings' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="briefcase-outline" size={16} color={Colors.primary} />
        <Text style={styles.bookingsLinkText}>My Vendor Bookings</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </TouchableOpacity>

      <FlatList
        contentContainerStyle={styles.content}
        data={vendors}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => (
          <VendorCard
            vendor={item}
            onPress={() => router.push(`/(tabs)/vendors/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={error ? 'alert-circle-outline' : 'storefront-outline'}
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : 'No vendors found'}</Text>
            <Text style={styles.emptyText}>
              {error || 'Check back later for new vendors in your area.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  bookingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 16,
    marginBottom: 0,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookingsLinkText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
