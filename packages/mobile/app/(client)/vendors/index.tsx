import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TextInput, StyleSheet, RefreshControl, TouchableOpacity,
  Image, Alert, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import AppButton from '@/components/AppButton';
import { CliMsgPill, formatDate, formatMoney, useClientFail } from '@/components/CliMsgShared';

interface VendorInfo {
  id: string;
  business_name: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  hourly_rate?: number | null;
  flat_rate?: number | null;
  is_verified?: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
}

interface VendorBooking {
  id: string;
  status: string;
  _source?: string;
  vendor?: VendorInfo | null;
  event_name?: string | null;
  event_date?: string | null;
  agreed_amount?: number | null;
  deposit_amount?: number | null;
  price_hidden?: boolean;
  invoice_ready?: boolean;
  notes?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎧 DJ',
  decorator: '🎨 Decorator',
  planner_coordinator: '📋 Planner / Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📷 Photographer',
  musicians: '🎵 Musicians',
  mc_host: '🎤 MC / Host',
  graphic_designer: '🖌️ Graphic Designer',
  other: '⭐ Other',
};

const CATEGORY_FILTERS = [{ value: '', label: 'All' }, ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  confirmed: 'success',
  pending: 'warning',
  declined: 'error',
  cancelled: 'neutral',
  completed: 'info',
};

type Tab = 'booked' | 'browse';

function VendorHeader({ v, right }: { v?: VendorInfo | null; right?: React.ReactNode }) {
  const place = [v?.city, v?.state].filter(Boolean).join(', ');
  return (
    <View style={styles.vHeader}>
      {v?.profile_image_url ? (
        <Image source={{ uri: v.profile_image_url }} style={styles.vImg} />
      ) : (
        <View style={[styles.vImg, styles.vImgPlaceholder]}>
          <Ionicons name="storefront-outline" size={26} color={Colors.primary} />
        </View>
      )}
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text style={styles.vName} numberOfLines={1}>{v?.business_name ?? 'Vendor'}</Text>
          {v?.is_verified ? <Ionicons name="checkmark-circle" size={16} color={Colors.info} /> : null}
        </View>
        {v?.category ? <Text style={styles.vCat}>{CATEGORY_LABELS[v.category] ?? v.category}</Text> : null}
        {place ? <Text style={styles.vPlace}>{place}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function ContactLinks({ v }: { v?: VendorInfo | null }) {
  if (!v || (!v.phone && !v.email && !v.website && !v.instagram)) return null;
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Could not open link'));
  return (
    <View style={styles.links}>
      {v.phone ? <Text style={styles.link} onPress={() => open(`tel:${v.phone}`)}>📞 {v.phone}</Text> : null}
      {v.email ? <Text style={styles.link} onPress={() => open(`mailto:${v.email}`)}>✉️ {v.email}</Text> : null}
      {v.website ? <Text style={styles.link} onPress={() => open(/^https?:\/\//i.test(v.website!) ? v.website! : `https://${v.website}`)}>🌐 Website</Text> : null}
      {v.instagram ? <Text style={styles.link} onPress={() => open(`https://instagram.com/${v.instagram!.replace('@', '')}`)}>📸 {v.instagram}</Text> : null}
    </View>
  );
}

export default function ClientVendorsScreen() {
  const router = useRouter();
  const fail = useClientFail();
  const [tab, setTab] = useState<Tab>('booked');

  const [booked, setBooked] = useState<VendorBooking[]>([]);
  const [bookedLoading, setBookedLoading] = useState(true);
  const [bookedError, setBookedError] = useState<string | null>(null);

  const [browse, setBrowse] = useState<VendorInfo[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [browseLoaded, setBrowseLoaded] = useState(false);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const browseReq = useRef(0);

  const loadBooked = useCallback(async () => {
    try {
      const data = await clientApi<VendorBooking[]>('/vendors');
      setBooked(Array.isArray(data) ? data : []);
      setBookedError(null);
    } catch (err) {
      setBookedError(fail(err, 'Failed to load your vendors.'));
    } finally {
      setBookedLoading(false);
    }
  }, [fail]);

  const loadBrowse = useCallback(async (cat: string) => {
    const req = ++browseReq.current;
    setBrowseLoading(true);
    try {
      const data = await clientApi<VendorInfo[]>(`/vendors/browse${cat ? `?category=${encodeURIComponent(cat)}` : ''}`);
      if (req !== browseReq.current) return;
      setBrowse(Array.isArray(data) ? data : []);
      setBrowseError(null);
      setBrowseLoaded(true);
    } catch (err) {
      if (req !== browseReq.current) return;
      setBrowseError(fail(err, 'Failed to load vendors.'));
    } finally {
      if (req === browseReq.current) setBrowseLoading(false);
    }
  }, [fail]);

  // Reload bookings on focus so a request/review made on a sub-screen shows up on return.
  useFocusEffect(useCallback(() => { loadBooked(); }, [loadBooked]));

  useEffect(() => {
    if (tab === 'browse' && !browseLoaded && !browseLoading && !browseError) loadBrowse(category);
  }, [tab, browseLoaded, browseLoading, browseError, category, loadBrowse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBooked(), tab === 'browse' ? loadBrowse(category) : Promise.resolve()]);
    setRefreshing(false);
  };

  const pickCategory = (value: string) => {
    setCategory(value);
    loadBrowse(value);
  };

  const cancelRequest = (b: VendorBooking) => {
    Alert.alert('Cancel request?', `Cancel your request to ${b.vendor?.business_name ?? 'this vendor'}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(b.id);
          try {
            await clientApi(`/vendors/requests/${b.id}`, { method: 'DELETE' });
            setBooked((prev) => prev.filter((x) => x.id !== b.id));
          } catch (err) {
            Alert.alert('Could not cancel', fail(err, 'Failed to cancel request.'));
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const openBook = (v: VendorInfo) =>
    router.push({ pathname: '/(client)/vendors/book', params: { vendorId: v.id, vendorName: v.business_name } } as never);
  const openReview = (v: VendorInfo) =>
    router.push({ pathname: '/(client)/vendors/review', params: { vendorId: v.id, vendorName: v.business_name } } as never);

  const q = search.trim().toLowerCase();
  const filteredBrowse = q
    ? browse.filter((v) => v.business_name.toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q))
    : browse;

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />;

  const renderBooked = ({ item }: { item: VendorBooking }) => {
    const v = item.vendor;
    const canCancel = item._source === 'booking_request' && item.status === 'pending';
    const canReview = !!v?.id && (item.status === 'confirmed' || item.status === 'completed');
    return (
      <View style={styles.card}>
        <VendorHeader v={v} right={<CliMsgPill label={item.status} tone={STATUS_TONE[item.status] ?? 'neutral'} />} />
        {item.event_name || item.event_date ? (
          <Text style={styles.meta}>
            📅 {item.event_name}{item.event_date ? ` · ${formatDate(item.event_date)}` : ''}
          </Text>
        ) : null}
        {item.price_hidden ? (
          <Text style={styles.meta}>{item.invoice_ready ? 'Pricing is on your invoice.' : 'Pricing will appear on your invoice.'}</Text>
        ) : null}
        {item.agreed_amount != null || item.deposit_amount != null ? (
          <View style={styles.amounts}>
            {item.agreed_amount != null ? (
              <View><Text style={styles.amountLabel}>Agreed amount</Text><Text style={styles.amount}>{formatMoney(item.agreed_amount)}</Text></View>
            ) : null}
            {item.deposit_amount != null ? (
              <View><Text style={styles.amountLabel}>Deposit</Text><Text style={styles.amount}>{formatMoney(item.deposit_amount)}</Text></View>
            ) : null}
          </View>
        ) : null}
        <ContactLinks v={v} />
        {item.notes ? <Text style={styles.notes}>“{item.notes}”</Text> : null}
        {canCancel || canReview ? (
          <View style={styles.actions}>
            {canReview ? <AppButton title="Leave a review" variant="secondary" style={styles.actionBtn} onPress={() => openReview(v!)} /> : null}
            {canCancel ? (
              <AppButton title="Cancel request" variant="outline" style={styles.actionBtn} loading={cancellingId === item.id} onPress={() => cancelRequest(item)} />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderBrowse = ({ item: v }: { item: VendorInfo }) => (
    <View style={styles.card}>
      <VendorHeader v={v} />
      {v.bio ? <Text style={styles.bio} numberOfLines={3}>{v.bio}</Text> : null}
      {(v.hourly_rate && v.hourly_rate > 0) || (v.flat_rate && v.flat_rate > 0) ? (
        <View style={styles.rates}>
          {v.hourly_rate && v.hourly_rate > 0 ? <Text style={styles.rate}>${v.hourly_rate}/hr</Text> : null}
          {v.flat_rate && v.flat_rate > 0 ? <Text style={styles.rate}>${v.flat_rate.toLocaleString()} flat</Text> : null}
        </View>
      ) : null}
      <ContactLinks v={v} />
      <AppButton title="Request booking" onPress={() => openBook(v)} style={styles.bookBtn} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {([['booked', `My Vendors${booked.length ? ` (${booked.length})` : ''}`], ['browse', 'Find a Vendor']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'booked' ? (
        bookedLoading ? (
          <LoadingState message="Loading vendors…" />
        ) : bookedError && booked.length === 0 ? (
          <AcctErrorState message={bookedError} onRetry={() => { setBookedLoading(true); loadBooked(); }} />
        ) : (
          <FlatList
            data={booked}
            keyExtractor={(b) => b.id}
            renderItem={renderBooked}
            contentContainerStyle={styles.list}
            refreshControl={refreshControl}
            ListHeaderComponent={bookedError ? <Text style={styles.banner}>{bookedError}</Text> : null}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <EmptyState icon="storefront-outline" title="No vendors yet" message="Vendors you book or are booked for your events appear here." />
                <AppButton title="Find a vendor" variant="outline" onPress={() => setTab('browse')} style={styles.emptyBtn} />
              </View>
            }
          />
        )
      ) : (
        <>
          <View style={styles.filters}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or city"
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
                returnKeyType="search"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
              {CATEGORY_FILTERS.map((c) => {
                const active = c.value === category;
                return (
                  <TouchableOpacity key={c.value || 'all'} style={[styles.chip, active && styles.chipActive]} onPress={() => pickCategory(c.value)} activeOpacity={0.8}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          {(browseLoading && !refreshing) || (!browseLoaded && !browseError) ? (
            <LoadingState message="Loading vendors…" />
          ) : browseError && browse.length === 0 ? (
            <AcctErrorState message={browseError} onRetry={() => loadBrowse(category)} />
          ) : (
            <FlatList
              data={filteredBrowse}
              keyExtractor={(v) => v.id}
              renderItem={renderBrowse}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              refreshControl={refreshControl}
              ListHeaderComponent={browseError ? <Text style={styles.banner}>{browseError}</Text> : null}
              ListEmptyComponent={<EmptyState icon="search" title="No vendors found" message="Try a different category or search." />}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', margin: 16, marginBottom: 8, padding: 4, backgroundColor: Colors.borderLight, borderRadius: Radius.lg },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.md },
  tabActive: { backgroundColor: Colors.surface, ...Shadow.sm },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textPrimary },
  filters: { paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, gap: 10, ...Shadow.sm },
  vHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  vImg: { width: 52, height: 52, borderRadius: Radius.md },
  vImgPlaceholder: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vName: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  vCat: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  vPlace: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  meta: { fontSize: 13, color: Colors.textSecondary },
  amounts: { flexDirection: 'row', gap: 24, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  amountLabel: { fontSize: 12, color: Colors.textMuted },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  link: { fontSize: 13, color: Colors.primary },
  notes: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, minHeight: 42, paddingVertical: 10, paddingHorizontal: 12 },
  bio: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  rates: { flexDirection: 'row', gap: 8 },
  rate: { fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.borderLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  bookBtn: { minHeight: 44, paddingVertical: 10 },
  emptyWrap: { flex: 1, alignItems: 'center' },
  emptyBtn: { minWidth: 160 },
});
