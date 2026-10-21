import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import { formatMoney, useClientFail } from '@/components/CliMsgShared';

interface ServiceItem {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  default_price?: number | string | null;
  image_url?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  facility_rental: '🏛️ Facility Rental',
  security_deposit: '🔒 Security Deposit',
  sound_system: '🔊 Sound System',
  av_equipment: '📽️ AV Equipment',
  planning_services: '📋 Planning Services',
  additional_time: '⏱️ Additional Time',
  hosting_services: '🎤 Hosting Services',
  catering: '🍽️ Catering',
  bar_services: '🍹 Bar Services',
  security_services: '🛡️ Security Services',
  decorations: '🎨 Decorations',
  sales_tax: '📊 Sales Tax',
  items: '📦 Items',
  furniture: '🪑 Furniture',
  misc: '✨ Miscellaneous',
};

const categoryLabel = (c?: string | null) => (c ? CATEGORY_LABELS[c] ?? c : 'Item');

export default function ClientItemsScreen() {
  const fail = useClientFail();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await clientApi<ServiceItem[]>('/items');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(fail(err, 'Failed to load items.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fail]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c)))],
    [items],
  );
  const filtered = category === 'all' ? items : items.filter((i) => i.category === category);

  if (loading) return <View style={styles.container}><LoadingState message="Loading items…" /></View>;
  if (error && items.length === 0) {
    return (
      <View style={styles.container}>
        <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {categories.length > 1 ? (
        <View style={styles.chipBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((cat) => {
              const active = cat === category;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {cat === 'all' ? 'All' : categoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <>
            {error ? <Text style={styles.banner}>{error}</Text> : null}
            {items.length > 0 ? <Text style={styles.count}>{items.length} item{items.length === 1 ? '' : 's'}</Text> : null}
          </>
        }
        ListEmptyComponent={<EmptyState icon="cube-outline" title="No items available" message="Your event organizer hasn't published any items or packages yet." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" /> : null}
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.cat}>{categoryLabel(item.category)}</Text>
              </View>
              <Text style={styles.price}>{formatMoney(item.default_price)}</Text>
            </View>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  chipBar: { backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 8 },
  count: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, gap: 10, ...Shadow.sm },
  image: { width: '100%', height: 150, borderRadius: Radius.md, backgroundColor: Colors.borderLight },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cat: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  price: { fontSize: 17, fontWeight: '700', color: Colors.primary },
  desc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
