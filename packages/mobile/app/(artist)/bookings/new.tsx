import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import NetField from '@/components/NetField';
import DateTimeField from '@/components/DateTimeField';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

// Mirrors web artist/dashboard/bookings/new -> POST /artist-bookings.
export default function NewArtistBookingScreen() {
  const router = useRouter();
  const [f, setF] = useState({
    event_name: '', event_date: '', event_start_time: '', event_end_time: '',
    venue_name: '', venue_address: '', client_name: '', client_phone: '', client_email: '',
    agreed_amount: '', deposit_amount: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.event_name.trim() || !f.client_name.trim() || !f.client_email.trim()) {
      Alert.alert('Missing info', 'Event name, client name and client email are required.');
      return;
    }
    if (f.event_date && !DATE_RE.test(f.event_date.trim())) {
      Alert.alert('Invalid date', 'Please pick a valid event date.');
      return;
    }
    for (const t of [f.event_start_time, f.event_end_time]) {
      if (t && !TIME_RE.test(t.trim())) {
        Alert.alert('Invalid time', 'Please pick a valid time.');
        return;
      }
    }
    const body: Record<string, any> = {
      event_name: f.event_name.trim(),
      client_name: f.client_name.trim(),
      client_email: f.client_email.trim(),
    };
    (['event_date', 'event_start_time', 'event_end_time', 'venue_name', 'venue_address', 'client_phone', 'notes'] as const)
      .forEach((k) => { if (f[k].trim()) body[k] = f[k].trim(); });
    if (f.agreed_amount.trim()) body.agreed_amount = parseFloat(f.agreed_amount);
    if (f.deposit_amount.trim()) body.deposit_amount = parseFloat(f.deposit_amount);

    setSaving(true);
    try {
      await apiRequest('/artist-bookings', { method: 'POST', body });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create booking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Event Details</Text>
          <NetField label="Event Name *" value={f.event_name} onChangeText={set('event_name')} placeholder="Wedding, Birthday Party, Corporate Event..." />
          <DateTimeField label="Event Date" mode="date" value={f.event_date} onChange={set('event_date')} clearable />
          <View style={styles.row}>
            <View style={styles.half}><DateTimeField label="Start" mode="time" value={f.event_start_time} onChange={set('event_start_time')} clearable /></View>
            <View style={styles.half}><DateTimeField label="End" mode="time" value={f.event_end_time} onChange={set('event_end_time')} clearable /></View>
          </View>
          <NetField label="Venue Name" value={f.venue_name} onChangeText={set('venue_name')} />
          <NetField label="Venue Address" value={f.venue_address} onChangeText={set('venue_address')} />
        </View>

        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Client</Text>
          <NetField label="Client Name *" value={f.client_name} onChangeText={set('client_name')} />
          <NetField label="Client Email *" value={f.client_email} onChangeText={set('client_email')} keyboardType="email-address" autoCapitalize="none" />
          <NetField label="Phone" value={f.client_phone} onChangeText={set('client_phone')} keyboardType="phone-pad" />
        </View>

        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Financials</Text>
          <View style={styles.row}>
            <View style={styles.half}><NetField label="Agreed ($)" value={f.agreed_amount} onChangeText={set('agreed_amount')} keyboardType="decimal-pad" placeholder="0.00" /></View>
            <View style={styles.half}><NetField label="Deposit ($)" value={f.deposit_amount} onChangeText={set('deposit_amount')} keyboardType="decimal-pad" placeholder="0.00" /></View>
          </View>
          <NetField label="Notes" value={f.notes} onChangeText={set('notes')} multiline placeholder="Anything relevant to this booking..." />
        </View>

        <AppButton title="Create Booking" onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  heading: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
