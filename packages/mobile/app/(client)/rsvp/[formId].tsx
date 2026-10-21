import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Alert, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctField from '@/components/AcctField';
import AppButton from '@/components/AppButton';
import { rsvpApi } from '@/components/CliMsgRsvpApi';
import { CliMsgPill, formatDate, useClientFail } from '@/components/CliMsgShared';
import type { RsvpEvent } from './index';

interface RsvpGuest {
  id: string;
  rsvp_token: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  status: 'pending' | 'attending' | 'declined';
  plus_ones: number;
  meal_preference: string;
  table_assignment: string | null;
  sms_sent_at: string | null;
  has_arrived?: boolean;
}

const RSVP_BASE_URL = 'https://eventecos.com/rsvp';

const MEAL_LABELS: Record<string, string> = {
  standard: 'Standard', vegetarian: 'Vegetarian', vegan: 'Vegan', gluten_free: 'Gluten-Free', kosher: 'Kosher',
};

const STATUS_TONE = { attending: 'success', declined: 'error', pending: 'neutral' } as const;

type Panel = 'none' | 'add' | 'bulk';

export default function ClientRsvpGuestsScreen() {
  const { formId } = useLocalSearchParams<{ formId: string }>();
  const fail = useClientFail();
  const [event, setEvent] = useState<RsvpEvent | null>(null);
  const [guests, setGuests] = useState<RsvpGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [panel, setPanel] = useState<Panel>('none');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addTable, setAddTable] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTable, setEditTable] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const [events, list] = await Promise.all([
        rsvpApi<RsvpEvent[]>('/events'),
        rsvpApi<RsvpGuest[]>(`/guests/${formId}`),
      ]);
      setEvent((Array.isArray(events) ? events : []).find((e) => e.intake_form_id === formId) ?? null);
      setGuests(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError(fail(err, 'Unable to load RSVP details.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formId, fail]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const summary = event?.rsvp_summary ?? { total: guests.length, attending: 0, declined: 0, pending: 0, headcount: 0 };
  const unsentCount = guests.filter((g) => !g.sms_sent_at && (g.guest_phone || g.guest_email)).length;

  const addGuest = async () => {
    if (!addName.trim()) {
      Alert.alert('Name required', 'Enter the guest’s name.');
      return;
    }
    setSaving(true);
    try {
      await rsvpApi(`/guests/${formId}`, {
        method: 'POST',
        body: {
          guest_name: addName.trim(),
          guest_phone: addPhone.trim() || undefined,
          guest_email: addEmail.trim() || undefined,
          table_assignment: addTable.trim() || undefined,
        },
      });
      setAddName(''); setAddPhone(''); setAddEmail(''); setAddTable('');
      setPanel('none');
      await load();
    } catch (err) {
      Alert.alert('Could not add guest', fail(err, 'Failed to add guest.'));
    } finally {
      setSaving(false);
    }
  };

  const bulkAdd = async () => {
    // Each line: "Name, phone, email" — only the name is required.
    const rows = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return { guest_name: parts[0], guest_phone: parts[1] || undefined, guest_email: parts[2] || undefined };
      })
      .filter((g) => g.guest_name);
    if (!rows.length) {
      Alert.alert('Nothing to add', 'Enter one guest per line.');
      return;
    }
    setSaving(true);
    try {
      const res = await rsvpApi<{ added?: unknown[]; skipped?: Array<{ guest_name: string; reason: string }> }>(
        `/guests/${formId}/bulk`,
        { method: 'POST', body: { guests: rows } },
      );
      setBulkText('');
      setPanel('none');
      await load();
      const skipped = res?.skipped ?? [];
      if (skipped.length) {
        Alert.alert(
          `Added ${res?.added?.length ?? 0} guest(s)`,
          `Skipped ${skipped.length} duplicate${skipped.length === 1 ? '' : 's'}:\n${skipped.map((s) => `• ${s.guest_name}: ${s.reason}`).join('\n')}`,
        );
      }
    } catch (err) {
      Alert.alert('Could not add guests', fail(err, 'Failed to add guests.'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (g: RsvpGuest) => {
    if (editId === g.id) {
      setEditId(null);
      return;
    }
    setEditId(g.id);
    setEditTable(g.table_assignment ?? '');
    setEditPhone(g.guest_phone ?? '');
    setEditEmail(g.guest_email ?? '');
  };

  const saveEdit = async (g: RsvpGuest) => {
    setBusyId(g.id);
    try {
      await rsvpApi(`/guests/${formId}/${g.id}`, {
        method: 'PUT',
        body: { table_assignment: editTable.trim(), guest_phone: editPhone.trim(), guest_email: editEmail.trim() },
      });
      setEditId(null);
      await load();
    } catch (err) {
      Alert.alert('Could not update guest', fail(err, 'Failed to update guest.'));
    } finally {
      setBusyId(null);
    }
  };

  const removeGuest = (g: RsvpGuest) => {
    Alert.alert('Remove guest?', `Remove ${g.guest_name} from the list?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusyId(g.id);
          try {
            await rsvpApi(`/guests/${formId}/${g.id}`, { method: 'DELETE' });
            setEditId(null);
            await load();
          } catch (err) {
            Alert.alert('Could not remove guest', fail(err, 'Failed to remove guest.'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const sendOne = async (g: RsvpGuest) => {
    setBusyId(g.id);
    try {
      await rsvpApi(`/guests/${formId}/${g.id}/send`, { method: 'POST' });
      await load();
    } catch (err) {
      Alert.alert('Could not send invite', fail(err, 'Failed to send invite.'));
    } finally {
      setBusyId(null);
    }
  };

  const sendAll = async () => {
    setSendingAll(true);
    try {
      const res = await rsvpApi<{ sent: number; skipped?: number; duplicates?: number }>(`/send-all/${formId}`, { method: 'POST' });
      await load();
      Alert.alert(
        'Invites sent',
        `Sent ${res.sent} invite${res.sent !== 1 ? 's' : ''}${res.skipped ? `, skipped ${res.skipped} (no contact info)` : ''}${res.duplicates ? `, ${res.duplicates} not sent (same phone or email already invited)` : ''}.`,
      );
    } catch (err) {
      Alert.alert('Could not send invites', fail(err, 'Failed to send invites.'));
    } finally {
      setSendingAll(false);
    }
  };

  const shareLink = (g: RsvpGuest) => {
    Share.share({ message: `You're invited! RSVP here: ${RSVP_BASE_URL}/${g.rsvp_token}` }).catch(() => {});
  };

  const header = (
    <View style={styles.header}>
      {event?.event_date ? (
        <Text style={styles.date}>{formatDate(event.event_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      ) : null}
      {error ? <Text style={styles.banner}>{error}</Text> : null}

      <View style={styles.tiles}>
        {[
          { label: 'Total', value: summary.total, bg: Colors.borderLight, fg: Colors.textPrimary },
          { label: 'Attending', value: summary.attending, bg: Colors.successLight, fg: Colors.successText, sub: summary.headcount > summary.attending ? `${summary.headcount} w/ +1s` : undefined },
          { label: 'Declined', value: summary.declined, bg: Colors.errorLight, fg: Colors.errorText },
          { label: 'Pending', value: summary.pending, bg: Colors.warningLight, fg: Colors.warningText },
        ].map((t) => (
          <View key={t.label} style={[styles.tile, { backgroundColor: t.bg }]}>
            <Text style={[styles.tileValue, { color: t.fg }]}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
            {t.sub ? <Text style={[styles.tileSub, { color: t.fg }]}>{t.sub}</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <AppButton title="Add guest" style={styles.actionBtn} onPress={() => setPanel(panel === 'add' ? 'none' : 'add')} variant={panel === 'add' ? 'secondary' : 'primary'} />
        <AppButton title="Bulk add" style={styles.actionBtn} variant="outline" onPress={() => setPanel(panel === 'bulk' ? 'none' : 'bulk')} />
      </View>
      {unsentCount > 0 ? (
        <AppButton title={`Send all invites (${unsentCount})`} variant="secondary" loading={sendingAll} onPress={sendAll} style={styles.sendAll} />
      ) : null}

      {panel === 'add' ? (
        <View style={styles.panel}>
          <AcctField label="Guest name" required value={addName} onChangeText={setAddName} placeholder="Full name" />
          <AcctField label="Phone" value={addPhone} onChangeText={setAddPhone} placeholder="Optional" keyboardType="phone-pad" />
          <AcctField label="Email" value={addEmail} onChangeText={setAddEmail} placeholder="Optional" keyboardType="email-address" autoCapitalize="none" />
          <AcctField label="Table" value={addTable} onChangeText={setAddTable} placeholder="Optional" />
          <AppButton title="Save guest" onPress={addGuest} loading={saving} />
        </View>
      ) : null}
      {panel === 'bulk' ? (
        <View style={styles.panel}>
          <AcctField
            label="Guests (one per line)"
            hint="Format: Name, phone, email — only the name is required."
            value={bulkText}
            onChangeText={setBulkText}
            placeholder={'Jane Smith, 555-123-4567, jane@email.com\nJohn Doe'}
            multiline
            autoCapitalize="words"
          />
          <AppButton title="Add guests" onPress={bulkAdd} loading={saving} />
        </View>
      ) : null}
    </View>
  );

  const renderGuest = ({ item: g }: { item: RsvpGuest }) => {
    const editing = editId === g.id;
    const busy = busyId === g.id;
    const canSend = !!(g.guest_phone || g.guest_email);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <Text style={styles.gName}>{g.guest_name}</Text>
            <Text style={styles.gMeta}>
              {[g.guest_phone, g.guest_email].filter(Boolean).join(' · ') || 'No contact info'}
            </Text>
          </View>
          <CliMsgPill label={g.status} tone={STATUS_TONE[g.status] ?? 'neutral'} />
        </View>
        <View style={styles.tags}>
          {g.table_assignment ? <Text style={styles.tag}>Table {g.table_assignment}</Text> : null}
          {g.status === 'attending' && g.plus_ones > 0 ? <Text style={styles.tag}>+{g.plus_ones} guest{g.plus_ones > 1 ? 's' : ''}</Text> : null}
          {g.status === 'attending' && g.meal_preference && g.meal_preference !== 'standard' ? (
            <Text style={styles.tag}>{MEAL_LABELS[g.meal_preference] ?? g.meal_preference}</Text>
          ) : null}
          {g.status === 'attending' && g.has_arrived ? <Text style={[styles.tag, styles.tagArrived]}>Arrived</Text> : null}
          {g.sms_sent_at ? <Text style={styles.tag}>Invite sent</Text> : null}
        </View>
        <View style={styles.cardActions}>
          <AppButton title={editing ? 'Close' : 'Edit'} variant="ghost" style={styles.smallBtn} onPress={() => startEdit(g)} />
          <AppButton title="Share link" variant="ghost" style={styles.smallBtn} onPress={() => shareLink(g)} />
          {canSend ? (
            <AppButton title={g.sms_sent_at ? 'Resend' : 'Send'} variant="ghost" style={styles.smallBtn} loading={busy && !editing} onPress={() => sendOne(g)} />
          ) : null}
        </View>
        {editing ? (
          <View style={styles.editPanel}>
            <AcctField label="Table" value={editTable} onChangeText={setEditTable} />
            <AcctField label="Phone" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <AcctField label="Email" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.cardActions}>
              <AppButton title="Save" style={styles.flexBtn} loading={busy} onPress={() => saveEdit(g)} />
              <AppButton title="Remove" variant="outline" style={styles.flexBtn} disabled={busy} onPress={() => removeGuest(g)} />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: event?.event_name || 'Guest List' }} />
      {loading ? (
        <LoadingState message="Loading guests…" />
      ) : error && guests.length === 0 && !event ? (
        <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={guests}
          keyExtractor={(g) => g.id}
          renderItem={renderGuest}
          extraData={[editId, editTable, editPhone, editEmail, busyId]}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No guests yet" message="Add guests to send them personal RSVP links." />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  list: { padding: 16, gap: 10, paddingBottom: 40, flexGrow: 1 },
  header: { gap: 12, marginBottom: 4 },
  date: { fontSize: 14, color: Colors.textSecondary },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderRadius: Radius.lg, paddingVertical: 10, alignItems: 'center' },
  tileValue: { fontSize: 22, fontWeight: '800' },
  tileLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  tileSub: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, minHeight: 44, paddingVertical: 10 },
  sendAll: { minHeight: 44, paddingVertical: 10 },
  panel: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, gap: 8, ...Shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  gName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  gMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.borderLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.md },
  tagArrived: { backgroundColor: Colors.successLight, color: Colors.successText },
  cardActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 },
  flexBtn: { flex: 1, minHeight: 42, paddingVertical: 10 },
  editPanel: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
});
