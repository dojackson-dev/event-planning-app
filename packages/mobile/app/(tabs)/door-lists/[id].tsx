import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';

interface Guest {
  id: number;
  name: string;
  phone?: string | null;
  plus_one_count?: number;
  plusOneCount?: number;
  has_arrived?: boolean;
  hasArrived?: boolean;
  is_vip?: boolean;
  isVip?: boolean;
}

interface GuestListDetail {
  id: number;
  is_locked?: boolean;
  isLocked?: boolean;
  event?: { name?: string; date?: string; startTime?: string | null } | null;
  guests: Guest[];
}

type FilterKey = 'all' | 'arrived' | 'pending' | 'vip';

export default function DoorListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [guestList, setGuestList] = useState<GuestListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addPlusOnes, setAddPlusOnes] = useState('0');
  const [addIsVip, setAddIsVip] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lockUpdating, setLockUpdating] = useState(false);
  const [checkingIds, setCheckingIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest<GuestListDetail>(`/guest-lists/${id}`);
      setGuestList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load door list');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const guests = guestList?.guests || [];
  const isLocked = !!(guestList?.is_locked ?? guestList?.isLocked);

  const stats = useMemo(() => {
    const arrived = guests.filter((g) => !!(g.has_arrived ?? g.hasArrived)).length;
    const vip = guests.filter((g) => !!(g.is_vip ?? g.isVip)).length;
    return { total: guests.length, arrived, pending: guests.length - arrived, vip };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    let list = guests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q) || (g.phone ?? '').includes(q));
    }
    if (filter === 'arrived') list = list.filter((g) => !!(g.has_arrived ?? g.hasArrived));
    else if (filter === 'pending') list = list.filter((g) => !(g.has_arrived ?? g.hasArrived));
    else if (filter === 'vip') list = list.filter((g) => !!(g.is_vip ?? g.isVip));
    return list;
  }, [guests, search, filter]);

  const toggleArrival = async (guest: Guest) => {
    const arrived = !!(guest.has_arrived ?? guest.hasArrived);
    setCheckingIds((prev) => [...prev, guest.id]);
    try {
      await apiRequest(`/guest-lists/guests/${guest.id}/${arrived ? 'unarrive' : 'arrive'}`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Failed to update guest', err.message || 'Please try again.');
    } finally {
      setCheckingIds((prev) => prev.filter((x) => x !== guest.id));
    }
  };

  const handleAddGuest = async () => {
    if (!addName.trim() || !guestList) return;
    setAddLoading(true);
    try {
      await apiRequest(`/guest-lists/${guestList.id}/guests`, {
        method: 'POST',
        body: {
          name: addName.trim(),
          phone: addPhone.trim() || undefined,
          plusOnes: Number(addPlusOnes) || 0,
          isVip: addIsVip,
        },
      });
      setAddName('');
      setAddPhone('');
      setAddPlusOnes('0');
      setAddIsVip(false);
      setShowAddForm(false);
      await load();
    } catch (err: any) {
      Alert.alert('Failed to add guest', err.message || 'Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleImportRsvp = async () => {
    if (!guestList) return;
    setImporting(true);
    try {
      const res = await apiRequest<{ imported: number; skipped: number }>(`/guest-lists/${guestList.id}/import-rsvp`, { method: 'POST' });
      Alert.alert(
        'Import complete',
        res.imported === 0
          ? (res.skipped > 0 ? `All ${res.skipped} attending RSVP guests are already on the list.` : 'No attending RSVP guests found.')
          : `Imported ${res.imported} guest${res.imported !== 1 ? 's' : ''}${res.skipped > 0 ? ` (${res.skipped} already existed)` : ''}.`
      );
      await load();
    } catch (err: any) {
      Alert.alert('Failed to import', err.message || 'Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!guestList) return;
    setLockUpdating(true);
    try {
      await apiRequest(`/guest-lists/${guestList.id}`, { method: 'PUT', body: { isLocked: !isLocked } });
      await load();
    } catch (err: any) {
      Alert.alert('Failed to update lock state', err.message || 'Please try again.');
    } finally {
      setLockUpdating(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (error || !guestList) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Door list not found'}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredGuests}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View>
          <View style={[styles.headerCard, Shadow.md]}>
            <Text style={styles.eventName}>{guestList.event?.name || 'Guest List'}</Text>
            {guestList.event?.date && (
              <Text style={styles.eventDate}>
                {guestList.event.date}{guestList.event.startTime ? ` at ${guestList.event.startTime}` : ''}
              </Text>
            )}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.arrived}</Text>
                <Text style={styles.statLabel}>Arrived</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#B45309' }]}>{stats.vip}</Text>
                <Text style={styles.statLabel}>VIP</Text>
              </View>
            </View>
            <View style={styles.lockRow}>
              <Text style={styles.lockLabel}>{isLocked ? 'List Locked' : 'List Open'}</Text>
              <Switch
                value={isLocked}
                onValueChange={handleToggleLock}
                disabled={lockUpdating}
                trackColor={{ false: Colors.borderLight, true: Colors.primary }}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, Shadow.sm]} onPress={() => setShowAddForm((v) => !v)}>
              <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Add Guest</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, Shadow.sm]} onPress={handleImportRsvp} disabled={importing}>
              {importing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              )}
              <Text style={styles.actionBtnText}>Import RSVP</Text>
            </TouchableOpacity>
          </View>

          {showAddForm && (
            <View style={[styles.formCard, Shadow.sm]}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={addName} onChangeText={setAddName} placeholder="Guest name" placeholderTextColor={Colors.textMuted} />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={addPhone} onChangeText={setAddPhone} placeholder="Optional" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
              <Text style={styles.label}>Plus Ones</Text>
              <TextInput style={styles.input} value={addPlusOnes} onChangeText={setAddPlusOnes} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
              <TouchableOpacity style={styles.vipRow} onPress={() => setAddIsVip((v) => !v)}>
                <Ionicons name={addIsVip ? 'checkbox' : 'square-outline'} size={20} color={Colors.warning} />
                <Text style={styles.vipLabel}>Mark as VIP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (addLoading || !addName.trim()) && styles.submitBtnDisabled]}
                onPress={handleAddGuest}
                disabled={addLoading || !addName.trim()}
              >
                {addLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.submitBtnText}>Add Guest</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search guests"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.filterRow}>
            {(['all', 'arrived', 'pending', 'vip'] as FilterKey[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const arrived = !!(item.has_arrived ?? item.hasArrived);
        const isVip = !!(item.is_vip ?? item.isVip);
        const plusOnes = item.plus_one_count ?? item.plusOneCount ?? 0;
        const isChecking = checkingIds.includes(item.id);
        return (
          <View style={[styles.guestCard, Shadow.sm]}>
            <View style={{ flex: 1 }}>
              <View style={styles.guestNameRow}>
                <Text style={styles.guestName}>{item.name}</Text>
                {isVip && <Ionicons name="star" size={14} color={Colors.warning} />}
              </View>
              {item.phone && <Text style={styles.guestMeta}>{item.phone}</Text>}
              {plusOnes > 0 && <Text style={styles.guestMeta}>+{plusOnes} guest{plusOnes !== 1 ? 's' : ''}</Text>}
            </View>
            <TouchableOpacity
              style={[styles.arriveBtn, arrived ? styles.arriveBtnActive : styles.arriveBtnPending]}
              onPress={() => toggleArrival(item)}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color={arrived ? Colors.success : Colors.textMuted} />
              ) : (
                <>
                  <Ionicons name={arrived ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={arrived ? Colors.success : Colors.textMuted} />
                  <Text style={[styles.arriveBtnText, { color: arrived ? Colors.success : Colors.textMuted }]}>
                    {arrived ? 'Arrived' : 'Check In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      }}
      ListEmptyComponent={
        <EmptyState icon="people-outline" title="No guests found" message="Add a guest or import from RSVPs to get started." />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12, padding: 24 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  eventName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  eventDate: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  lockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  lockLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  vipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  vipLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#FFF' },

  guestCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10,
  },
  guestNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guestName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  guestMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  arriveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8,
  },
  arriveBtnActive: { backgroundColor: Colors.successLight },
  arriveBtnPending: { backgroundColor: Colors.background },
  arriveBtnText: { fontSize: 12, fontWeight: '700' },
});
