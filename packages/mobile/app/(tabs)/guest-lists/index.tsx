import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Alert, Share,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import EvtErrorState from '@/components/EvtErrorState';
import { formatDate } from '@/components/EvtDate';
import { EvtGuestList, normalizeGuestList, guestListShareMessage, doorLinkMessage } from '@/components/EvtGuestList';

export default function GuestListsScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<EvtGuestList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<any[]>('/guest-lists');
      setLists((Array.isArray(data) ? data : []).map(normalizeGuestList));
    } catch (err: any) {
      setError(err.message || 'Failed to load guest lists');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? lists.filter((l) => (l.event?.name || '').toLowerCase().includes(q)) : lists;
  }, [lists, search]);

  const toggleLock = async (l: EvtGuestList) => {
    setBusyId(l.id);
    try {
      await apiRequest(`/guest-lists/${l.id}/${l.isLocked ? 'unlock' : 'lock'}`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Failed to update guest list', err.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = (l: EvtGuestList) => {
    Alert.alert('Delete guest list', 'Are you sure you want to delete this guest list? All guests will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusyId(l.id);
          try {
            await apiRequest(`/guest-lists/${l.id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Failed to delete guest list', err.message || 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const share = async (message: string) => {
    try { await Share.share({ message }); } catch { /* dismissed */ }
  };

  const header = (
    <Stack.Screen
      options={{
        title: 'Guest Lists',
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/(tabs)/guest-lists/new' as any)} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (loading) return <>{header}<LoadingState message="Loading guest lists…" /></>;
  if (error && lists.length === 0) {
    return <>{header}<EvtErrorState title="Couldn't load guest lists" message={error} onRetry={() => { setLoading(true); load(); }} /></>;
  }

  return (
    <View style={styles.container}>
      {header}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by event"
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
        />
      </View>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(l) => String(l.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        renderItem={({ item: l }) => {
          const arrived = l.guests.filter((g) => g.hasArrived).length;
          const busy = busyId === l.id;
          return (
            <TouchableOpacity
              style={[styles.card, Shadow.sm]}
              activeOpacity={0.85}
              onPress={() => router.push(`/(tabs)/guest-lists/${l.id}` as any)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{l.event?.name || 'Guest List'}</Text>
                  <Text style={styles.meta}>{l.event?.date ? formatDate(l.event.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Text>
                </View>
                <View style={[styles.pill, l.isLocked ? styles.pillLocked : styles.pillOpen]}>
                  <Ionicons name={l.isLocked ? 'lock-closed' : 'lock-open'} size={11} color={l.isLocked ? Colors.errorText : Colors.successText} />
                  <Text style={[styles.pillText, { color: l.isLocked ? Colors.errorText : Colors.successText }]}>{l.isLocked ? 'Locked' : 'Open'}</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.meta}>{l.guests.length} guest{l.guests.length === 1 ? '' : 's'}{l.guests.length ? ` · ${arrived} arrived` : ''}</Text>
                {l.accessCode ? <Text style={styles.code}>{l.accessCode}</Text> : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => share(doorLinkMessage(l))} disabled={!l.arrivalToken} hitSlop={6}>
                  <Text style={[styles.action, { color: Colors.success }]}>Door Link</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => share(guestListShareMessage(l))} disabled={!l.shareToken} hitSlop={6}>
                  <Text style={[styles.action, { color: Colors.primary }]}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleLock(l)} disabled={busy} hitSlop={6}>
                  <Text style={[styles.action, { color: l.isLocked ? Colors.success : Colors.warning }]}>{busy ? '…' : l.isLocked ? 'Unlock' : 'Lock'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(l)} disabled={busy} hitSlop={6}>
                  <Text style={[styles.action, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={search ? 'No matching guest lists' : 'No guest lists found'}
            message={search ? 'Try a different search.' : 'Tap + to create your first guest list.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: Colors.errorLight, paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { fontSize: 13, color: Colors.errorText, flex: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillLocked: { backgroundColor: Colors.errorLight },
  pillOpen: { backgroundColor: Colors.successLight },
  pillText: { fontSize: 11, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  code: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', letterSpacing: 2, color: Colors.purpleText },
  actions: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  action: { fontSize: 13, fontWeight: '600' },
});
