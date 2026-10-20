import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { Vendor } from '@/types/vendor';
import VendorCard from '@/components/VendorCard';
import LoadingState from '@/components/LoadingState';
import NetChips from '@/components/NetChips';
import { fmtMoney, toList } from '@/components/netFormat';

// Raw shape returned by GET /vendors/public and /vendors/search (snake_case, per vendor_accounts table).
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
  is_verified?: boolean;
  hourly_rate?: number | null;
  flat_rate?: number | null;
  avgRating?: number | null;
  reviewCount?: number | null;
}

type Row = { vendor: Vendor; raw: RawVendor };

// Same categories as web dashboard/vendors.
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

const RADII = ['10', '25', '30', '50', '75', '100'];

const rateLabel = (v: RawVendor) =>
  v.hourly_rate ? `${fmtMoney(v.hourly_rate, 0)}/hr` : v.flat_rate ? `${fmtMoney(v.flat_rate, 0)} flat` : null;

export default function VendorsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState('30');
  const [query, setQuery] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (cat: string, zipCode: string, radiusMiles: string) => {
    const mine = ++seq.current;
    setError('');
    try {
      const params: string[] = [];
      if (zipCode) params.push(`zipCode=${encodeURIComponent(zipCode)}`, `radiusMiles=${encodeURIComponent(radiusMiles)}`);
      if (cat) params.push(`category=${encodeURIComponent(cat)}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const data = await apiRequest<any>(`${zipCode ? '/vendors/search' : '/vendors/public'}${qs}`);
      if (mine !== seq.current) return;
      // API returns { vendors, venues }; tolerate a bare array too.
      const list = toList<RawVendor>(data, 'vendors');
      setRows(
        list.map((v) => ({
          raw: v,
          vendor: {
            id: v.id,
            name: v.business_name || v.name || 'Vendor',
            description: v.bio || v.description,
            imageUrl: v.profile_image_url || v.imageUrl,
            category: v.category,
            city: v.city,
            state: v.state,
          },
        })),
      );
    } catch (err: any) {
      if (mine === seq.current) setError(err.message || 'Failed to load vendors.');
    } finally {
      if (mine === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => { load(category, zip.trim(), radius); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  const applyCategory = (c: string) => {
    setCategory(c);
    setLoading(true);
    load(c, zip.trim(), radius);
  };

  const search = () => {
    Keyboard.dismiss();
    setLoading(true);
    load(category, zip.trim(), radius);
  };

  const applyRadius = (r: string) => {
    setRadius(r);
    if (zip.trim()) {
      setLoading(true);
      load(category, zip.trim(), r);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? rows.filter(({ vendor, raw }) =>
        [vendor.name, vendor.category, vendor.city, vendor.state, raw.bio].some((x) => (x || '').toLowerCase().includes(q)))
    : rows;

  const header = (
    <View>
      <View style={styles.links}>
        <TouchableOpacity style={[styles.linkBtn, Shadow.sm]} onPress={() => router.push('/(tabs)/vendors/bookings' as any)} activeOpacity={0.8}>
          <Ionicons name="briefcase-outline" size={16} color={Colors.primary} />
          <Text style={styles.linkText}>My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkBtn, Shadow.sm]} onPress={() => router.push('/(tabs)/vendor-invoices' as any)} activeOpacity={0.8}>
          <Ionicons name="card-outline" size={16} color={Colors.primary} />
          <Text style={styles.linkText}>Vendor Invoices</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search vendors by name, city…"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <View style={styles.zipRow}>
        <View style={[styles.searchRow, styles.zipInputWrap]}>
          <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={zip}
            onChangeText={setZip}
            placeholder="Zip code"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
            onSubmitEditing={search}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.goBtn} onPress={search} activeOpacity={0.8}>
          <Text style={styles.goText}>Search</Text>
        </TouchableOpacity>
      </View>
      {!!zip.trim() && (
        <View style={styles.chipBleed}>
          <NetChips value={radius} onChange={applyRadius} options={RADII.map((r) => ({ value: r, label: `${r} mi` }))} />
        </View>
      )}
      <View style={styles.chipBleed}>
        <NetChips value={category} onChange={applyCategory} options={CATEGORIES} />
      </View>
    </View>
  );

  if (loading && rows.length === 0 && !error) return <LoadingState message="Finding vendors..." />;

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(item) => item.vendor.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(category, zip.trim(), radius); }} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => (
          <VendorCard
            vendor={item.vendor}
            rating={item.raw.avgRating}
            reviewCount={item.raw.reviewCount}
            verified={item.raw.is_verified}
            rate={rateLabel(item.raw)}
            onPress={() => router.push(`/(tabs)/vendors/${item.vendor.id}` as any)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Searching..." />
          ) : (
            <View style={styles.empty}>
              <Ionicons name={error ? 'alert-circle-outline' : 'storefront-outline'} size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : 'No vendors found'}</Text>
              <Text style={styles.emptyText}>
                {error || 'Try a different category, a wider radius, or clear the zip code.'}
              </Text>
              {!!error && (
                <TouchableOpacity style={styles.goBtn} onPress={search}><Text style={styles.goText}>Retry</Text></TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  links: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  linkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  linkText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  chipBleed: { marginHorizontal: -16 },
  zipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  zipInputWrap: { flex: 1 },
  goBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  goText: { color: Colors.textWhite, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
