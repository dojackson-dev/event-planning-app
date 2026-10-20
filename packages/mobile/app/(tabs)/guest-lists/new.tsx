import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import EvtErrorState from '@/components/EvtErrorState';
import EvtField from '@/components/EvtField';
import EvtPicker, { EvtPickerOption } from '@/components/EvtPicker';
import { formatDate, normalizeEvent, EvtEvent, todayKey } from '@/components/EvtDate';

export default function NewGuestListScreen() {
  const router = useRouter();
  const { eventId: qEventId, intakeFormId: qIntake } = useLocalSearchParams<{ eventId?: string; intakeFormId?: string }>();
  const [events, setEvents] = useState<EvtEvent[]>([]);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [clients, setClients] = useState<EvtPickerOption[]>([]);
  const [eventId, setEventId] = useState(qEventId || '');
  const [clientId, setClientId] = useState(qIntake || '');
  const [maxPlus, setMaxPlus] = useState('2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const [ev, gl, forms] = await Promise.all([
        apiRequest<any[]>('/events'),
        apiRequest<any[]>('/guest-lists').catch(() => []),
        apiRequest<any[]>('/intake-forms').catch(() => []),
      ]);
      setEvents((Array.isArray(ev) ? ev : []).map(normalizeEvent));
      setTakenIds(new Set((Array.isArray(gl) ? gl : []).map((g) => String(g.event_id ?? g.eventId))));
      setClients(
        (Array.isArray(forms) ? forms : []).map((f: any) => ({
          value: f.id,
          label: f.contactName || f.contact_name || 'Unknown',
          sub: f.contactPhone || f.contact_phone || undefined,
        })),
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onPickEvent = (id: string) => {
    setEventId(id);
    const ev = events.find((e) => e.id === id);
    if (ev?.intakeFormId && !clientId) setClientId(ev.intakeFormId);
  };

  const save = async () => {
    if (!eventId) { Alert.alert('Select an event', 'Please choose an event for this guest list.'); return; }
    if (!clientId) { Alert.alert('Select a client', 'Please choose a client for this guest list.'); return; }
    const plus = parseInt(maxPlus, 10);
    setSaving(true);
    try {
      const created = await apiRequest<{ id: number }>('/guest-lists', {
        method: 'POST',
        body: { clientId, eventId, maxGuestsPerPerson: Number.isNaN(plus) ? 0 : plus },
      });
      router.replace(`/(tabs)/guest-lists/${created.id}` as any);
    } catch (err: any) {
      Alert.alert('Failed to create guest list', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Stack.Screen options={{ title: 'New Guest List' }} /><LoadingState message="Loading…" /></>;
  if (error) return <><Stack.Screen options={{ title: 'New Guest List' }} /><EvtErrorState title="Couldn't load events" message={error} onRetry={() => { setLoading(true); load(); }} /></>;

  const today = todayKey();
  const eventOptions: EvtPickerOption[] = events
    .filter((e) => !takenIds.has(e.id) || e.id === eventId)
    .sort((a, b) => {
      const ua = a.date >= today;
      const ub = b.date >= today;
      if (ua !== ub) return ua ? -1 : 1;
      return ua ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    })
    .map((e) => ({ value: e.id, label: e.intakeEventName || e.name, sub: formatDate(e.date) }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'New Guest List' }} />
      <EvtPicker label="Event *" value={eventId} onChange={onPickEvent} options={eventOptions} placeholder="Select an event" emptyLabel="None" searchable />
      {eventOptions.length === 0 ? <Text style={styles.hint}>Every event already has a guest list.</Text> : null}
      <EvtPicker label="Client *" value={clientId} onChange={setClientId} options={clients} placeholder="Select a client" emptyLabel="None" searchable />
      <EvtField label="Max plus-ones per guest" value={maxPlus} onChangeText={setMaxPlus} keyboardType="number-pad" />
      <AppButton title="Create Guest List" onPress={save} loading={saving} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: -6, marginBottom: 12 },
});
