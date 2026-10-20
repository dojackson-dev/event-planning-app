import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import EvtField from '@/components/EvtField';
import DateTimeField from '@/components/DateTimeField';
import EvtPicker, { EvtPickerOption } from '@/components/EvtPicker';
import { isValidDateInput, isValidTimeInput, todayKey } from '@/components/EvtDate';

export default function NewEventScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [name, setName] = useState('');
  const [date, setDate] = useState(dateParam && isValidDateInput(dateParam) ? dateParam : todayKey());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [venueId, setVenueId] = useState('');
  const [guests, setGuests] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'draft'>('scheduled');
  const [venues, setVenues] = useState<{ id: string; name: string; address?: string; city?: string }[]>([]);
  const [clients, setClients] = useState<EvtPickerOption[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<{ venues: any[] }>('/owner/venues').then((r) => setVenues(r?.venues || [])).catch(() => {});
    apiRequest<any[]>('/intake-forms')
      .then((rows) =>
        setClients(
          (rows || []).map((f: any) => ({
            value: f.id,
            label: f.contactName || f.contact_name || 'Unknown',
            sub: f.contactPhone || f.contact_phone || undefined,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Event name is required';
    if (!isValidDateInput(date)) next.date = 'Select a valid date';
    if (!isValidTimeInput(start)) next.start = 'Select a valid start time';
    if (end && !isValidTimeInput(end)) next.end = 'Select a valid end time';
    if (guests && Number.isNaN(parseInt(guests, 10))) next.guests = 'Enter a number';
    setErrors(next);
    if (Object.keys(next).length) return;

    const venue = venues.find((v) => v.id === venueId);
    setSaving(true);
    try {
      const created = await apiRequest<{ id: string }>('/events', {
        method: 'POST',
        body: {
          name: name.trim(),
          date,
          startTime: start,
          endTime: end || undefined,
          status,
          clientId: clientId || undefined,
          ...(venue && { venue: venue.name, venueId: venue.id }),
          ...(description.trim() && { description: description.trim() }),
          ...(guests && { maxGuests: parseInt(guests, 10) }),
        },
      });
      router.replace(`/(tabs)/events/${created.id}` as any);
    } catch (err: any) {
      Alert.alert('Failed to create event', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'New Event' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <EvtField label="Event Name" required value={name} onChangeText={setName} error={errors.name} placeholder="e.g. Smith Wedding Reception" />
        <DateTimeField mode="date" label="Date" required value={date} onChange={setDate} error={errors.date} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <DateTimeField mode="time" label="Start Time" required value={start} onChange={setStart} error={errors.start} />
          </View>
          <View style={{ flex: 1 }}>
            <DateTimeField mode="time" label="End Time" value={end} onChange={setEnd} error={errors.end} clearable />
          </View>
        </View>
        <EvtPicker
          label="Venue"
          value={venueId}
          onChange={setVenueId}
          emptyLabel="— No venue assigned —"
          placeholder="— No venue assigned —"
          options={venues.map((v) => ({ value: v.id, label: v.name, sub: [v.address, v.city].filter(Boolean).join(', ') || undefined }))}
        />
        <EvtPicker label="Client" value={clientId} onChange={setClientId} emptyLabel="No client" placeholder="No client" options={clients} searchable />
        <EvtField label="Max Guests" value={guests} onChangeText={setGuests} error={errors.guests} keyboardType="number-pad" placeholder="Optional" />
        <EvtField label="Description" value={description} onChangeText={setDescription} multiline placeholder="Optional" />

        <Text style={styles.label}>Status</Text>
        <View style={styles.row}>
          {(['scheduled', 'draft'] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s === 'scheduled' ? 'Scheduled' : 'Draft'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <AppButton title="Create Event" onPress={save} loading={saving} style={{ marginTop: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
});
