import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctField from '@/components/AcctField';
import AcctSelect from '@/components/AcctSelect';
import { SecurityRow, secName, secEventId, secArrival, secEventStart, secLocalDate } from '@/components/AcctSecurity';

interface EventOption { id: string; name: string; date: string }

// Doubles as the "add security" screen when the route id is "new".
export default function SecurityDetailScreen() {
  const { id, eventId: presetEventId } = useLocalSearchParams<{ id: string; eventId?: string }>();
  const router = useRouter();
  const isNew = id === 'new';

  const [row, setRow] = useState<SecurityRow | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<'arrival' | 'delete' | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventId, setEventId] = useState(presetEventId || '');

  const hydrate = (s: SecurityRow) => {
    setRow(s);
    setName(secName(s) === 'Security personnel' ? '' : secName(s));
    setPhone(s.phone || '');
    setEventId(secEventId(s));
  };

  const load = useCallback(async () => {
    try {
      const [ev, sec] = await Promise.all([
        apiRequest<EventOption[]>('/events').catch(() => [] as EventOption[]),
        isNew ? Promise.resolve(null) : apiRequest<SecurityRow>(`/security/${id}`),
      ]);
      setEvents(Array.isArray(ev) ? ev : []);
      if (sec) hydrate(sec);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load security personnel.');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  const eventOptions = useMemo(() => events.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: e.date ? secLocalDate(e.date).toLocaleDateString() : undefined,
  })), [events]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const body = { name: name.trim(), phone: phone.trim(), eventId: eventId || null };
      if (isNew) {
        await apiRequest('/security', { method: 'POST', body });
        router.back();
      } else {
        const updated = await apiRequest<SecurityRow>(`/security/${id}`, { method: 'PUT', body });
        hydrate(updated);
        setEditing(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save security personnel.');
    } finally {
      setSaving(false);
    }
  };

  const recordArrival = () => {
    Alert.alert('Record arrival', 'Record arrival time now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Record',
        onPress: async () => {
          setBusy('arrival');
          try {
            const updated = await apiRequest<SecurityRow>(`/security/${id}/arrival`, { method: 'POST' });
            hydrate(updated);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to record arrival.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete security record', 'Are you sure you want to delete this security record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await apiRequest(`/security/${id}`, { method: 'DELETE' });
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete security record.');
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Loading…" />;
  if (loadError) return <AcctErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} />;

  if (editing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: isNew ? 'Add Security' : 'Edit Security' }} />
        <AcctField label="Full name" required value={name} onChangeText={setName} placeholder="Full name" />
        <AcctField label="Phone number" required value={phone} onChangeText={setPhone} placeholder="+15551234567" keyboardType="phone-pad" />
        <AcctSelect
          label="Event assignment"
          value={eventId}
          options={eventOptions}
          onChange={setEventId}
          placeholder="Select an event…"
          emptyLabel="— No event —"
        />
        <AppButton title={isNew ? 'Add security personnel' : 'Save changes'} onPress={handleSave} loading={saving} style={styles.btn} />
        {!isNew && (
          <AppButton title="Cancel" variant="ghost" onPress={() => { if (row) hydrate(row); setEditing(false); }} disabled={saving} />
        )}
      </ScrollView>
    );
  }

  if (!row) return <AcctErrorState message="Security personnel not found." />;

  const arrival = secArrival(row);
  const start = secEventStart(row);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: secName(row) }} />
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{secName(row)}</Text>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value} selectable>{row.phone || '—'}</Text>
        <Text style={styles.label}>Event</Text>
        {row.event ? (
          <Text style={styles.value}>
            {row.event.name}
            {row.event.date ? `\n${secLocalDate(row.event.date).toLocaleDateString()}${start ? ` at ${start}` : ''}` : ''}
          </Text>
        ) : <Text style={styles.valueMuted}>No event assigned</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Arrival tracking</Text>
        {arrival ? (
          <View style={[styles.banner, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.bannerText, { color: Colors.successText }]}>Arrived at {new Date(arrival).toLocaleString()}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.valueMuted}>Arrival time not recorded yet</Text>
            <AppButton title="Record arrival now" onPress={recordArrival} loading={busy === 'arrival'} disabled={busy !== null} style={styles.btn} />
          </>
        )}
      </View>

      <AppButton title="Edit" variant="outline" onPress={() => setEditing(true)} disabled={busy !== null} style={styles.btn} />
      <AppButton title="Delete" variant="ghost" onPress={confirmDelete} loading={busy === 'delete'} disabled={busy !== null} textStyle={{ color: Colors.error }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 16, ...Shadow.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 6 },
  value: { fontSize: 15, color: Colors.textPrimary, marginBottom: 6 },
  valueMuted: { fontSize: 14, color: Colors.textMuted },
  banner: { padding: 12, borderRadius: Radius.md },
  bannerText: { fontSize: 14, fontWeight: '600' },
  btn: { marginTop: 12, marginBottom: 4 },
});
