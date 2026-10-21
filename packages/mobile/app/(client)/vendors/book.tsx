import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import AcctField from '@/components/AcctField';
import DateTimeField from '@/components/DateTimeField';
import { useClientFail } from '@/components/CliMsgShared';

const pad = (n: number) => String(n).padStart(2, '0');
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function ClientVendorBookScreen() {
  const { vendorId, vendorName } = useLocalSearchParams<{ vendorId: string; vendorName?: string }>();
  const router = useRouter();
  const fail = useClientFail();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ eventName?: string; eventDate?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!eventName.trim()) next.eventName = 'Event name is required';
    if (!eventDate) next.eventDate = 'Event date is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await clientApi('/vendors/book', {
        method: 'POST',
        body: {
          vendorAccountId: vendorId,
          eventName: eventName.trim(),
          eventDate,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          venueName: venueName.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      Alert.alert('Request sent', `${vendorName || 'The vendor'} will confirm shortly.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setSubmitError(fail(err, 'Failed to send booking request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Send a booking request to {vendorName || 'this vendor'}.</Text>
        <AcctField label="Event name" required value={eventName} onChangeText={setEventName} placeholder="e.g. Sarah's Birthday" />
        {errors.eventName ? <Text style={styles.error}>{errors.eventName}</Text> : null}
        <DateTimeField label="Event date" mode="date" required value={eventDate} onChange={setEventDate} error={errors.eventDate} minimumDate={todayLocal()} />
        <DateTimeField label="Start time" mode="time" value={startTime} onChange={setStartTime} clearable />
        <DateTimeField label="End time" mode="time" value={endTime} onChange={setEndTime} clearable />
        <AcctField label="Venue name" value={venueName} onChangeText={setVenueName} placeholder="Optional" />
        <AcctField label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything the vendor should know" multiline />
        {submitError ? <Text style={styles.banner}>{submitError}</Text> : null}
        <AppButton title="Send request" onPress={submit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  error: { fontSize: 12, color: Colors.error, marginTop: -10, marginBottom: 12 },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 12 },
});
