import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import VendorCard from '@/components/VendorCard';
import { Vendor } from '@/types/vendor';

// Raw shape returned by GET /vendors/public (snake_case, per vendor_accounts table).
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

export default function GuestVendorsScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiRequest<any>('/vendors/public');
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

  const promptLogin = () => {
    Alert.alert('Log in required', 'Log in to view vendor details and request bookings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log In', onPress: () => router.push('/(auth)/login') },
    ]);
  };

  if (loading) return <LoadingState message="Loading vendors..." />;

  if (error && vendors.length === 0) {
    return <EmptyState icon="alert-circle-outline" title="Couldn't load vendors" message={error} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vendors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={<EmptyState icon="storefront-outline" title="No vendors yet" message="Check back soon for local vendors." />}
        renderItem={({ item }) => (
          <VendorCard vendor={item} onPress={promptLogin} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
});
