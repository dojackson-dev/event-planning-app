import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import VendorCard from '@/components/VendorCard';
import EmptyState from '@/components/EmptyState';
import type { Vendor } from '@/types/vendor';

// Raw shape returned by GET /vendors/public (snake_case, per vendor_accounts table).
interface RawVendor {
  id: string;
  business_name?: string;
  bio?: string;
  profile_image_url?: string;
  category: string;
  city?: string;
  state?: string;
}

export default function PromoterVendorsDirectoryScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<any>('/vendors/public');
      const list: RawVendor[] = Array.isArray(data) ? data : (data?.vendors || []);
      const mapped: Vendor[] = list.map((v) => ({
        id: v.id,
        name: v.business_name || 'Vendor',
        description: v.bio,
        imageUrl: v.profile_image_url,
        category: v.category,
        city: v.city,
        state: v.state,
      }));
      setVendors(mapped);
    } catch (e: any) {
      setError(e.message || 'Failed to load vendors');
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
    ? vendors.filter((v) => {
        const name = v.name.toLowerCase();
        const category = (v.category || '').toLowerCase();
        const loc = [v.city, v.state].filter(Boolean).join(' ').toLowerCase();
        return name.includes(q) || category.includes(q) || loc.includes(q);
      })
    : vendors;

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
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search vendors by name, category, or city"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
        renderItem={({ item }) => (
          <VendorCard vendor={item} onPress={() => router.push(`/(promoter)/vendors/${item.id}` as any)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title="No vendors found"
            message="Try a different search, or check back later."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, margin: 16, marginBottom: 0,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
});
