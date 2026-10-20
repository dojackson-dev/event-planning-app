import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, Switch, StyleSheet, Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import {
  asArray, num, fmtMoney, errMsg, finStyles as f,
  ErrorState, ErrorBanner, SearchBar, FilterChips, FormSheet, Field, toneByName,
} from '@/components/FinUI';

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  default_price?: number;
  image_url?: string | null;
  is_active?: boolean;
}

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'facility_rental', label: 'Facility Rental', icon: 'business-outline' },
  { key: 'security_deposit', label: 'Security Deposit', icon: 'cash-outline' },
  { key: 'sound_system', label: 'Sound System', icon: 'musical-notes-outline' },
  { key: 'av_equipment', label: 'AV Equipment', icon: 'tv-outline' },
  { key: 'planning_services', label: 'Planning Services', icon: 'calendar-outline' },
  { key: 'additional_time', label: 'Additional Time', icon: 'time-outline' },
  { key: 'hosting_services', label: 'Hosting Services', icon: 'mic-outline' },
  { key: 'catering', label: 'Catering', icon: 'restaurant-outline' },
  { key: 'bar_services', label: 'Bar Services', icon: 'wine-outline' },
  { key: 'security_services', label: 'Security Services', icon: 'shield-outline' },
  { key: 'decorations', label: 'Decorations', icon: 'sparkles-outline' },
  { key: 'sales_tax', label: 'Sales Tax', icon: 'receipt-outline' },
  { key: 'items', label: 'Items', icon: 'cube-outline' },
  { key: 'furniture', label: 'Furniture', icon: 'bed-outline' },
  { key: 'misc', label: 'Miscellaneous', icon: 'grid-outline' },
];

const catOf = (key: string) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

const BLANK = { name: '', description: '', category: 'misc', default_price: '', is_active: true };

export default function ItemsScreen() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/service-items');
      setItems(asArray<ServiceItem>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load items'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const filterOptions = useMemo(() => {
    const used = new Set(items.map(i => i.category));
    return [{ key: 'all', label: 'All' }, ...CATEGORIES.filter(c => used.has(c.key)).map(c => ({ key: c.key, label: c.label }))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(i => filter === 'all' || i.category === filter)
      .filter(i => !q || i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }, [items, filter, search]);

  const openNew = () => { setEditing(null); setForm(BLANK); setSheet(true); };
  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setForm({
      name: item.name, description: item.description || '', category: item.category || 'misc',
      default_price: String(num(item.default_price)), is_active: item.is_active !== false,
    });
    setSheet(true);
  };

  const save = async () => {
    if (!form.name.trim()) { Alert.alert('Validation', 'Name is required.'); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || form.name.trim(), // description is required by the backend
      category: form.category,
      default_price: parseFloat(form.default_price) || 0,
      is_active: form.is_active,
      ...(editing ? {} : { sort_order: 0 }),
    };
    setSaving(true);
    try {
      if (editing) await apiRequest(`/service-items/${editing.id}`, { method: 'PUT', body: payload });
      else await apiRequest('/service-items', { method: 'POST', body: payload });
      setSheet(false);
      await fetchItems();
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, 'Failed to save item'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: ServiceItem) =>
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/service-items/${item.id}`, { method: 'DELETE' });
            setItems(prev => prev.filter(i => i.id !== item.id));
          } catch (err: any) {
            Alert.alert('Error', errMsg(err, 'Failed to delete item'));
          }
        },
      },
    ]);

  if (loading) return <LoadingState message="Loading items..." />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={fetchItems} />;

  return (
    <View style={f.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search items" />
      <FilterChips options={filterOptions} value={filter} onChange={setFilter} />
      <View style={f.headerRow}>
        <Text style={f.headerTitle}>{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</Text>
        <TouchableOpacity style={f.newBtn} onPress={openNew}>
          <Ionicons name="add" size={18} color={Colors.textWhite} />
          <Text style={f.newBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>
      {!!error && <ErrorBanner message={error} onRetry={fetchItems} />}

      <FlatList
        contentContainerStyle={f.list}
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
            onRefresh={() => { setRefreshing(true); fetchItems(); }} />
        }
        renderItem={({ item }) => {
          const cat = catOf(item.category);
          const inactive = item.is_active === false;
          return (
            <TouchableOpacity style={[f.card, inactive && { opacity: 0.6 }]} onPress={() => openEdit(item)} activeOpacity={0.75}>
              <View style={styles.row}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbIcon]}>
                    <Ionicons name={cat.icon} size={22} color={toneByName('info').text} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={f.cardTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={f.cardMeta} numberOfLines={1}>{cat.label}{inactive ? ' · Inactive' : ''}</Text>
                  {!!item.description && item.description !== item.name && (
                    <Text style={f.cardMeta} numberOfLines={2}>{item.description}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={f.cardAmount}>{fmtMoney(item.default_price)}</Text>
                  <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="pricetags-outline"
            title={items.length === 0 ? 'No items yet' : 'No items match'}
            message={items.length === 0 ? 'Add services and packages you can drop into invoices and estimates.' : 'Try a different search or category.'}
          />
        }
      />

      <FormSheet
        visible={sheet}
        title={editing ? 'Edit Item' : 'Add Item'}
        onClose={() => setSheet(false)}
        onSubmit={save}
        submitLabel={editing ? 'Save Changes' : 'Add Item'}
        submitting={saving}
      >
        <Field label="Name" value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} placeholder="e.g. Main Hall Rental" />
        <Field label="Description" value={form.description} onChangeText={t => setForm(p => ({ ...p, description: t }))} multiline />
        <Field label="Default price (USD)" value={form.default_price} onChangeText={t => setForm(p => ({ ...p, default_price: t }))} keyboardType="decimal-pad" placeholder="0.00" />
        <View>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, form.category === c.key && styles.chipActive]}
                onPress={() => setForm(p => ({ ...p, category: c.key }))}
              >
                <Text style={[styles.chipText, form.category === c.key && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active (available on invoices & estimates)</Text>
          <Switch
            value={form.is_active}
            onValueChange={v => setForm(p => ({ ...p, is_active: v }))}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textWhite}
          />
        </View>
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.borderLight },
  thumbIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.infoLight },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.textWhite },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary },
});
