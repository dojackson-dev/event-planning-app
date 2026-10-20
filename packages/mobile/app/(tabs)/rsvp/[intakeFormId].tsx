import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, Share, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import EvtErrorState from '@/components/EvtErrorState';
import AppButton from '@/components/AppButton';
import EvtField from '@/components/EvtField';
import { formatDate } from '@/components/EvtDate';
import { EVT_FRONTEND_URL } from '@/components/EvtGuestList';

interface RsvpSummary { total: number; attending: number; declined: number; pending: number; headcount: number }
interface RsvpEventInfo {
  intake_form_id: string;
  event_name: string | null;
  event_date: string | null;
  rsvp_summary: RsvpSummary;
}
interface RsvpGuest {
  id: string;
  rsvp_token: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  status: 'pending' | 'attending' | 'declined';
  plus_ones: number;
  meal_preference?: string;
  table_assignment: string | null;
  sms_sent_at: string | null;
  has_arrived?: boolean;
}

const MEAL_LABELS: Record<string, string> = {
  standard: 'Standard', vegetarian: 'Vegetarian', vegan: 'Vegan', gluten_free: 'Gluten-Free', kosher: 'Kosher',
};

type Filter = 'all' | 'attending' | 'declined' | 'pending';

const statusStyle = (s: string) =>
  s === 'attending'
    ? { bg: Colors.successLight, fg: Colors.successText, label: 'Attending', icon: 'checkmark-circle' as const }
    : s === 'declined'
      ? { bg: Colors.errorLight, fg: Colors.errorText, label: 'Declined', icon: 'close-circle' as const }
      : { bg: Colors.borderLight, fg: Colors.textSecondary, label: 'Pending', icon: 'time' as const };

export default function RsvpGuestsScreen() {
  const { intakeFormId } = useLocalSearchParams<{ intakeFormId: string }>();
  const [info, setInfo] = useState<RsvpEventInfo | null>(null);
  const [guests, setGuests] = useState<RsvpGuest[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [mode, setMode] = useState<'none' | 'add' | 'bulk'>('none');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addTable, setAddTable] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTable, setEditTable] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const load = useCallback(async () => {
    if (!intakeFormId) return;
    try {
      setError('');
      const [events, g, imgs] = await Promise.all([
        apiRequest<RsvpEventInfo[]>('/rsvp/events'),
        apiRequest<RsvpGuest[]>(`/rsvp/guests/${intakeFormId}`),
        apiRequest<string[]>(`/rsvp/images/${intakeFormId}`).catch(() => []),
      ]);
      setInfo((Array.isArray(events) ? events : []).find((e) => e.intake_form_id === intakeFormId) || null);
      setGuests(Array.isArray(g) ? g : []);
      setImages(Array.isArray(imgs) ? imgs : []);
    } catch (err: any) {
      setError(err.message || 'Unable to load this event’s RSVP details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [intakeFormId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const summary: RsvpSummary = info?.rsvp_summary ?? {
    total: guests.length,
    attending: guests.filter((g) => g.status === 'attending').length,
    declined: guests.filter((g) => g.status === 'declined').length,
    pending: guests.filter((g) => g.status === 'pending').length,
    headcount: 0,
  };
  const unsent = guests.filter((g) => !g.sms_sent_at && (g.guest_phone || g.guest_email)).length;
  const visible = useMemo(() => (filter === 'all' ? guests : guests.filter((g) => g.status === filter)), [guests, filter]);

  const addGuest = async () => {
    if (!addName.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest(`/rsvp/guests/${intakeFormId}`, {
        method: 'POST',
        body: {
          guest_name: addName.trim(),
          guest_phone: addPhone.trim() || undefined,
          guest_email: addEmail.trim() || undefined,
          table_assignment: addTable.trim() || undefined,
        },
      });
      setAddName(''); setAddPhone(''); setAddEmail(''); setAddTable(''); setMode('none');
      await load();
    } catch (err: any) {
      Alert.alert('Failed to add guest', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const bulkAdd = async () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const list = lines
      .map((line) => {
        const p = line.split(',').map((x) => x.trim());
        return { guest_name: p[0], guest_phone: p[1] || undefined, guest_email: p[2] || undefined };
      })
      .filter((g) => g.guest_name);
    if (!list.length) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<{ added?: any[]; skipped?: { guest_name: string; reason: string }[] }>(
        `/rsvp/guests/${intakeFormId}/bulk`,
        { method: 'POST', body: { guests: list } },
      );
      setBulkText(''); setMode('none');
      await load();
      const skipped = res?.skipped ?? [];
      if (skipped.length) {
        Alert.alert(
          `Added ${res?.added?.length ?? 0} guest(s)`,
          `Skipped ${skipped.length} duplicate${skipped.length === 1 ? '' : 's'}:\n${skipped.map((s) => `- ${s.guest_name}: ${s.reason}`).join('\n')}`,
        );
      }
    } catch (err: any) {
      Alert.alert('Failed to add guests', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (g: RsvpGuest) => {
    setEditId(g.id);
    setEditTable(g.table_assignment || '');
    setEditPhone(g.guest_phone || '');
    setEditEmail(g.guest_email || '');
  };

  const saveEdit = async (guestId: string) => {
    setEditSaving(true);
    try {
      await apiRequest(`/rsvp/guests/${intakeFormId}/${guestId}`, {
        method: 'PUT',
        body: { table_assignment: editTable.trim(), guest_phone: editPhone.trim(), guest_email: editEmail.trim() },
      });
      setEditId(null);
      await load();
    } catch (err: any) {
      Alert.alert('Failed to update guest', err.message || 'Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const removeGuest = (g: RsvpGuest) => {
    Alert.alert('Remove guest', `Remove ${g.guest_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/rsvp/guests/${intakeFormId}/${g.id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Failed to remove guest', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const sendOne = async (g: RsvpGuest) => {
    setSendingId(g.id);
    try {
      await apiRequest(`/rsvp/guests/${intakeFormId}/${g.id}/send`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Failed to send invite', err.message || 'Please try again.');
    } finally {
      setSendingId(null);
    }
  };

  const sendAll = async () => {
    setSendingAll(true);
    try {
      const res = await apiRequest<{ sent: number; skipped?: number; duplicates?: number }>(`/rsvp/send-all/${intakeFormId}`, { method: 'POST' });
      Alert.alert(
        'Invites sent',
        `Sent ${res.sent} invite${res.sent !== 1 ? 's' : ''}${res.skipped ? `, skipped ${res.skipped} (no contact info)` : ''}${res.duplicates ? `, ${res.duplicates} not sent (same phone or email already invited)` : ''}.`,
      );
      await load();
    } catch (err: any) {
      Alert.alert('Failed to send invites', err.message || 'Please try again.');
    } finally {
      setSendingAll(false);
    }
  };

  const shareLink = async (g: RsvpGuest) => {
    try { await Share.share({ message: `${EVT_FRONTEND_URL}/rsvp/${g.rsvp_token}` }); } catch { /* dismissed */ }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    Alert.alert('Remove image', 'Remove this invitation image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/rsvp/images/${intakeFormId}`, { method: 'PUT', body: { images: next } });
            setImages(next);
          } catch (err: any) {
            Alert.alert('Failed to remove image', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) return <><Stack.Screen options={{ title: 'RSVPs' }} /><LoadingState message="Loading RSVPs…" /></>;
  if (error && guests.length === 0 && !info) {
    return <><Stack.Screen options={{ title: 'RSVPs' }} /><EvtErrorState title="Couldn't load RSVPs" message={error} onRetry={() => { setLoading(true); load(); }} /></>;
  }

  const tiles: { label: string; value: number; sub?: string; bg: string; fg: string }[] = [
    { label: 'Total', value: summary.total, bg: Colors.borderLight, fg: Colors.textPrimary },
    { label: 'Attending', value: summary.attending, sub: summary.headcount > summary.attending ? `${summary.headcount} w/ +1s` : undefined, bg: Colors.successLight, fg: Colors.successText },
    { label: 'Declined', value: summary.declined, bg: Colors.errorLight, fg: Colors.errorText },
    { label: 'Pending', value: summary.pending, bg: Colors.warningLight, fg: Colors.warningText },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: info?.event_name || 'RSVPs' }} />
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Text style={styles.eventName}>{info?.event_name ?? 'RSVP'}</Text>
            {info?.event_date ? <Text style={styles.eventDate}>{formatDate(info.event_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text> : null}

            <View style={styles.tiles}>
              {tiles.map((t) => (
                <View key={t.label} style={[styles.tile, { backgroundColor: t.bg }]}>
                  <Text style={[styles.tileValue, { color: t.fg }]}>{t.value}</Text>
                  <Text style={styles.tileLabel}>{t.label}</Text>
                  {t.sub ? <Text style={[styles.tileSub, { color: t.fg }]}>{t.sub}</Text> : null}
                </View>
              ))}
            </View>

            <View style={[styles.card, Shadow.sm]}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Invitation Images</Text>
                <Text style={styles.cardHint}>{images.length}/2</Text>
              </View>
              {images.length === 0 ? (
                <Text style={styles.cardHint}>No images yet. Upload invitation images from the web app.</Text>
              ) : images.map((url, i) => (
                <View key={url + i} style={styles.imageWrap}>
                  <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
                  <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(i)}>
                    <Ionicons name="close" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.actionsRow}>
              <AppButton title="Add Guest" onPress={() => setMode(mode === 'add' ? 'none' : 'add')} style={styles.actionBtn} />
              <AppButton title="Bulk Add" onPress={() => setMode(mode === 'bulk' ? 'none' : 'bulk')} variant="outline" style={styles.actionBtn} />
            </View>
            {unsent > 0 ? (
              <AppButton title={`Send All (${unsent})`} onPress={sendAll} loading={sendingAll} variant="secondary" style={{ marginBottom: 12 }} />
            ) : null}

            {mode === 'add' ? (
              <View style={[styles.card, Shadow.sm]}>
                <EvtField label="Name" required value={addName} onChangeText={setAddName} autoCapitalize="words" placeholder="Guest's full name" />
                <EvtField label="Phone (for verification)" value={addPhone} onChangeText={setAddPhone} keyboardType="phone-pad" placeholder="555-867-5309" />
                <EvtField label="Email (optional)" value={addEmail} onChangeText={setAddEmail} keyboardType="email-address" autoCapitalize="none" placeholder="guest@email.com" />
                <EvtField label="Table (optional)" value={addTable} onChangeText={setAddTable} placeholder="e.g. Table 5" />
                <AppButton title="Add Guest" onPress={addGuest} loading={submitting} disabled={!addName.trim()} />
              </View>
            ) : null}
            {mode === 'bulk' ? (
              <View style={[styles.card, Shadow.sm]}>
                <EvtField label="One guest per line" value={bulkText} onChangeText={setBulkText} multiline autoCapitalize="none"
                  placeholder={'Name, phone, email\nJane Doe, 555-123-4567, jane@email.com'} style={{ minHeight: 120 }} />
                <AppButton title="Add Guests" onPress={bulkAdd} loading={submitting} disabled={!bulkText.trim()} />
              </View>
            ) : null}

            <View style={styles.filterRow}>
              {(['all', 'attending', 'pending', 'declined'] as const).map((f) => (
                <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: g }) => {
          const st = statusStyle(g.status);
          const editing = editId === g.id;
          const meal = g.meal_preference && g.meal_preference !== 'standard' ? MEAL_LABELS[g.meal_preference] || g.meal_preference : '';
          return (
            <View style={[styles.guestCard, Shadow.sm]}>
              <View style={styles.guestTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{g.guest_name}</Text>
                  {g.guest_phone ? <Text style={styles.guestMeta}>{g.guest_phone}</Text> : null}
                  {g.guest_email ? <Text style={styles.guestMeta}>{g.guest_email}</Text> : null}
                  <Text style={styles.guestMeta}>
                    {[g.plus_ones > 0 ? `+${g.plus_ones}` : '', meal, g.table_assignment ? `Table ${g.table_assignment}` : '', g.has_arrived ? 'Arrived' : '']
                      .filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={12} color={st.fg} />
                  <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>

              {editing ? (
                <View style={styles.editBox}>
                  <EvtField label="Table" value={editTable} onChangeText={setEditTable} />
                  <EvtField label="Phone" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
                  <EvtField label="Email" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
                  <View style={styles.actionsRow}>
                    <AppButton title="Cancel" variant="outline" onPress={() => setEditId(null)} style={styles.actionBtn} />
                    <AppButton title="Save" onPress={() => saveEdit(g.id)} loading={editSaving} style={styles.actionBtn} />
                  </View>
                </View>
              ) : (
                <View style={styles.guestActions}>
                  <TouchableOpacity onPress={() => sendOne(g)} disabled={sendingId === g.id || !(g.guest_phone || g.guest_email)} hitSlop={6}>
                    <Text style={[styles.action, { color: Colors.primary }, !(g.guest_phone || g.guest_email) && { opacity: 0.4 }]}>
                      {sendingId === g.id ? 'Sending…' : g.sms_sent_at ? 'Resend' : 'Send Invite'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shareLink(g)} hitSlop={6}><Text style={[styles.action, { color: Colors.purple }]}>Share Link</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => startEdit(g)} hitSlop={6}><Text style={[styles.action, { color: Colors.textSecondary }]}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => removeGuest(g)} hitSlop={6}><Text style={[styles.action, { color: Colors.error }]}>Remove</Text></TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title={filter === 'all' ? 'No guests yet' : `No ${filter} guests`} message={filter === 'all' ? 'Add guests to send them RSVP links.' : undefined} />
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 10 },
  errorText: { fontSize: 13, color: Colors.errorText, flex: 1 },
  eventName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  eventDate: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  tile: { flex: 1, borderRadius: Radius.lg, paddingVertical: 10, alignItems: 'center' },
  tileValue: { fontSize: 20, fontWeight: '800' },
  tileLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  tileSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardHint: { fontSize: 12, color: Colors.textMuted },
  imageWrap: { marginTop: 10, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  image: { width: '100%', height: 150 },
  imageRemove: {
    position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, minHeight: 44, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
  guestCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  guestTop: { flexDirection: 'row', gap: 8 },
  guestName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  guestMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  guestActions: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  action: { fontSize: 13, fontWeight: '600' },
  editBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
