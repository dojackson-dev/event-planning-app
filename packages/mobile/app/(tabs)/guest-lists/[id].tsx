import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Share, RefreshControl, Switch, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import EvtErrorState from '@/components/EvtErrorState';
import AppButton from '@/components/AppButton';
import EvtField from '@/components/EvtField';
import { formatDate, formatTime } from '@/components/EvtDate';
import {
  EvtGuestList, EvtGuest, normalizeGuestList, guestListShareMessage, doorLinkMessage,
} from '@/components/EvtGuestList';

export default function GuestListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<EvtGuestList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plusOnes, setPlusOnes] = useState('0');
  const [isVip, setIsVip] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest<any>(`/guest-lists/${id}`);
      if (!data || !data.id) throw new Error('Guest list not found');
      setList(normalizeGuestList(data));
    } catch (err: any) {
      setError(err.message || 'Failed to load guest list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const share = async (message: string) => {
    try { await Share.share({ message }); } catch { /* dismissed */ }
  };

  const addGuest = async () => {
    if (!list) return;
    if (!name.trim()) { setFormError('Name is required'); return; }
    const plus = parseInt(plusOnes, 10) || 0;
    if (list.maxGuestsPerPerson > 0 && plus > list.maxGuestsPerPerson) {
      setFormError(`Plus ones can't exceed ${list.maxGuestsPerPerson}`);
      return;
    }
    setFormError('');
    setAdding(true);
    try {
      await apiRequest(`/guest-lists/${list.id}/guests`, {
        method: 'POST',
        body: { name: name.trim(), phone: phone.trim() || undefined, plusOnes: plus, isVip },
      });
      setName(''); setPhone(''); setPlusOnes('0'); setIsVip(false); setShowAdd(false);
      await load();
    } catch (err: any) {
      Alert.alert('Failed to add guest', err.message || 'Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const removeGuest = (g: EvtGuest) => {
    Alert.alert('Remove guest', `Remove ${g.name} from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/guest-lists/guests/${g.id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Failed to remove guest', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const toggleLock = async () => {
    if (!list) return;
    setBusy(true);
    try {
      await apiRequest(`/guest-lists/${list.id}/${list.isLocked ? 'unlock' : 'lock'}`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Failed to update guest list', err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const deleteList = () => {
    if (!list) return;
    Alert.alert('Delete guest list', 'All guests will be removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiRequest(`/guest-lists/${list.id}`, { method: 'DELETE' });
            router.replace('/(tabs)/guest-lists' as any);
          } catch (err: any) {
            Alert.alert('Failed to delete guest list', err.message || 'Please try again.');
            setBusy(false);
          }
        },
      },
    ]);
  };

  const smsClient = async () => {
    if (!list) return;
    setSmsSending(true);
    try {
      const res = await apiRequest<{ sent: boolean; to?: string; error?: string }>(`/guest-lists/${list.id}/sms-client`, { method: 'POST' });
      Alert.alert(res.sent ? 'Sent' : 'Not sent', res.sent ? 'Link and access code texted to the client.' : res.error || 'Failed to send SMS');
    } catch (err: any) {
      Alert.alert('Failed to send SMS', err.message || 'Please try again.');
    } finally {
      setSmsSending(false);
    }
  };

  if (loading) return <><Stack.Screen options={{ title: 'Guest List' }} /><LoadingState message="Loading guest list…" /></>;
  if (!list) {
    return (
      <>
        <Stack.Screen options={{ title: 'Guest List' }} />
        <EvtErrorState title="Couldn't load guest list" message={error || 'Guest list not found'} onRetry={() => { setLoading(true); load(); }} />
      </>
    );
  }

  const arrived = list.guests.filter((g) => g.hasArrived).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: list.event?.name || 'Guest List' }} />
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={list.guests}
        keyExtractor={(g) => String(g.id)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            <View style={[styles.headerCard, Shadow.md]}>
              <Text style={styles.eventName}>{list.event?.name || 'Guest List'}</Text>
              {list.event?.date ? (
                <Text style={styles.eventDate}>
                  {formatDate(list.event.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  {list.event.startTime ? ` at ${formatTime(list.event.startTime)}` : ''}
                </Text>
              ) : null}
              <View style={styles.codeRow}>
                <Text style={styles.codeLabel}>Access Code</Text>
                <Text style={styles.code}>{list.accessCode || '—'}</Text>
              </View>
              <Text style={styles.stats}>{list.guests.length} guests · {arrived} arrived</Text>
              <View style={styles.lockRow}>
                <Text style={styles.lockLabel}>{list.isLocked ? 'List Locked' : 'List Open'}</Text>
                <Switch value={list.isLocked} onValueChange={toggleLock} disabled={busy} trackColor={{ false: Colors.borderLight, true: Colors.primary }} />
              </View>
            </View>

            <View style={styles.actionsRow}>
              <AppButton title="Share Link" onPress={() => share(guestListShareMessage(list))} disabled={!list.shareToken} style={styles.actionBtn} />
              <AppButton title="Add Guest" onPress={() => setShowAdd((v) => !v)} variant="outline" style={styles.actionBtn} />
            </View>
            <View style={styles.actionsRow}>
              <AppButton title="Door Link" onPress={() => share(doorLinkMessage(list))} disabled={!list.arrivalToken} variant="outline" style={styles.actionBtn} />
              <AppButton title="Text Client" onPress={smsClient} loading={smsSending} variant="outline" style={styles.actionBtn} />
            </View>
            <View style={styles.actionsRow}>
              <AppButton title="Open Door List" onPress={() => router.push(`/(tabs)/door-lists/${list.id}` as any)} variant="secondary" style={styles.actionBtn} />
              <AppButton title="Delete List" onPress={deleteList} variant="outline" disabled={busy}
                style={{ ...styles.actionBtn, borderColor: Colors.error }} textStyle={{ color: Colors.error }} />
            </View>

            {showAdd ? (
              <View style={[styles.formCard, Shadow.sm]}>
                <EvtField label="Name" required value={name} onChangeText={setName} autoCapitalize="words" />
                <EvtField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optional" />
                <EvtField label={`Plus Ones${list.maxGuestsPerPerson > 0 ? ` (max ${list.maxGuestsPerPerson})` : ''}`} value={plusOnes} onChangeText={setPlusOnes} keyboardType="number-pad" />
                <TouchableOpacity style={styles.vipRow} onPress={() => setIsVip((v) => !v)}>
                  <Ionicons name={isVip ? 'checkbox' : 'square-outline'} size={20} color={Colors.warning} />
                  <Text style={styles.vipLabel}>Mark as VIP</Text>
                </TouchableOpacity>
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}
                <AppButton title="Add Guest" onPress={addGuest} loading={adding} style={{ marginTop: 12 }} />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Guests ({list.guests.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.guestCard, Shadow.sm, item.isVip && styles.guestVip]}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.guestName}>{item.name}</Text>
                {item.isVip ? <Ionicons name="star" size={14} color={Colors.warning} /> : null}
              </View>
              {item.phone ? <Text style={styles.guestMeta}>{item.phone}</Text> : null}
              <Text style={styles.guestMeta}>Plus ones: {item.plusOnes}{item.hasArrived ? ' · Arrived' : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => removeGuest(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No guests added yet" message='Tap "Add Guest" to start building your guest list.' />}
      />
      {busy ? <View style={styles.busy}><ActivityIndicator color={Colors.primary} /></View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  eventName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  eventDate: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  codeLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  code: { fontSize: 18, fontWeight: '800', letterSpacing: 3, color: Colors.purpleText },
  stats: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
  lockRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  lockLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 8 },
  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  vipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  vipLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  formError: { fontSize: 13, color: Colors.error, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginTop: 8, marginBottom: 10 },
  guestCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10,
  },
  guestVip: { backgroundColor: Colors.warningLight },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guestName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  guestMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  busy: { position: 'absolute', top: 12, right: 12 },
});
