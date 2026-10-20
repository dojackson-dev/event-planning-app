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
import NetChips from '@/components/NetChips';
import { fmtMoney } from '@/components/netFormat';
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
  is_verified?: boolean;
  hourly_rate?: number | null;
  flat_rate?: number | null;
  avgRating?: number | null;
  reviewCount?: number | null;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'dj', label: 'DJ' },
  { value: 'decorator', label: 'Decorator' },
  { value: 'planner_coordinator', label: 'Planner' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'musicians', label: 'Musicians' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'other', label: 'Other' },
];

export default function PromoterVendorsDirectoryScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [raw, setRaw] = useState<Record<string, RawVendor>>({});
  const [category, setCategory] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (cat = category, zipCode = zip.trim()) => {
    setError(null);
    try {
      const params: string[] = [];
      if (zipCode) params.push(`zipCode=${encodeURIComponent(zipCode)}`);
      if (cat) params.push(`category=${encodeURIComponent(cat)}`);
      const data = await apiRequest<any>(`${zipCode ? '/vendors/search' : '/vendors/public'}${params.length ? `?${params.join('&')}` : ''}`);
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
      setRaw(Object.fromEntries(list.map((v) => [v.id, v])));
    } catch (e: any) {
      setError(e.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <View style={styles.zipWrap}>
        <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={zip}
          onChangeText={setZip}
          placeholder="Zip code (searches within 30 miles)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="search"
          onSubmitEditing={() => { setLoading(true); load(category, zip.trim()); }}
        />
      </View>
      <NetChips
        value={category}
        activeColor={Colors.purple}
        onChange={(c) => { setCategory(c); setLoading(true); load(c, zip.trim()); }}
        options={CATEGORIES}
      />
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
        renderItem={({ item }) => (
          <VendorCard
            vendor={item}
            rating={raw[item.id]?.avgRating}
            reviewCount={raw[item.id]?.reviewCount}
            verified={raw[item.id]?.is_verified}
            rate={raw[item.id]?.hourly_rate ? `${fmtMoney(raw[item.id].hourly_rate, 0)}/hr` : raw[item.id]?.flat_rate ? `${fmtMoney(raw[item.id].flat_rate, 0)} flat` : null}
            onPress={() => router.push(`/(promoter)/vendors/${item.id}` as any)} />
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
  zipWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 8,
  },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
});
