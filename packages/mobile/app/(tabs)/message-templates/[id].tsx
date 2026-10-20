import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctField from '@/components/AcctField';
import AcctChips from '@/components/AcctChips';
import DateTimeField from '@/components/DateTimeField';

type TemplateMessageType = 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
type TemplateRecipientType = 'client' | 'guest' | 'security' | 'all';

interface MessageTemplate {
  id: string;
  name: string;
  messageType: TemplateMessageType;
  content: string;
  recipientType: TemplateRecipientType;
  sendBeforeDays: number | null;
  sendTime: string | null;
  repeatIntervalDays: number | null;
  autoSend: boolean;
  isActive: boolean;
}

const MESSAGE_TYPES: { value: TemplateMessageType; label: string }[] = [
  { value: 'reminder', label: 'Reminder' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'update', label: 'Update' },
  { value: 'custom', label: 'Custom' },
];

const RECIPIENT_TYPES: { value: TemplateRecipientType; label: string }[] = [
  { value: 'client', label: 'Clients only' },
  { value: 'guest', label: 'Guests only' },
  { value: 'security', label: 'Security only' },
  { value: 'all', label: 'All recipients' },
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Doubles as the "new template" screen when the route id is "new".
export default function MessageTemplateFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [messageType, setMessageType] = useState<TemplateMessageType>('reminder');
  const [recipientType, setRecipientType] = useState<TemplateRecipientType>('client');
  const [content, setContent] = useState('');
  const [sendBeforeDays, setSendBeforeDays] = useState('');
  const [sendTime, setSendTime] = useState('09:00');
  const [repeatIntervalDays, setRepeatIntervalDays] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const t = await apiRequest<MessageTemplate>(`/message-templates/${id}`);
      setName(t.name);
      setMessageType(t.messageType);
      setRecipientType(t.recipientType);
      setContent(t.content);
      setSendBeforeDays(t.sendBeforeDays != null ? String(t.sendBeforeDays) : '');
      setSendTime(t.sendTime ? t.sendTime.slice(0, 5) : '');
      setRepeatIntervalDays(t.repeatIntervalDays != null ? String(t.repeatIntervalDays) : '');
      setAutoSend(!!t.autoSend);
      setIsActive(!!t.isActive);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load template.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!isNew) load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const wholeNumberOrNull = (v: string): number | null | undefined => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Template name is required.'); return; }
    if (!content.trim()) { Alert.alert('Validation', 'Message content is required.'); return; }
    const before = wholeNumberOrNull(sendBeforeDays);
    const repeat = wholeNumberOrNull(repeatIntervalDays);
    if (before === undefined || repeat === undefined) {
      Alert.alert('Validation', 'Days must be whole numbers.');
      return;
    }
    if (sendTime.trim() && !TIME_REGEX.test(sendTime.trim())) {
      Alert.alert('Validation', 'Select a valid send time.');
      return;
    }
    setSaving(true);
    try {
      await apiRequest(isNew ? '/message-templates' : `/message-templates/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: {
          name: name.trim(),
          messageType,
          content,
          recipientType,
          sendBeforeDays: before,
          sendTime: sendTime.trim() || null,
          repeatIntervalDays: repeat,
          autoSend,
          isActive,
        },
      });
      Alert.alert(isNew ? 'Template created' : 'Template saved', undefined, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading template…" />;
  if (loadError) return <AcctErrorState message={loadError} onRetry={load} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'New Template' : 'Edit Template' }} />

      <AcctField label="Template name" required value={name} onChangeText={setName} placeholder="e.g., 1 Week Reminder" />

      <Text style={styles.label}>Message type *</Text>
      <View style={styles.block}><AcctChips options={MESSAGE_TYPES} value={messageType} onChange={setMessageType} /></View>

      <Text style={styles.label}>Send to *</Text>
      <View style={styles.block}><AcctChips options={RECIPIENT_TYPES} value={recipientType} onChange={setRecipientType} /></View>

      <AcctField
        label="Message content"
        required
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        placeholder="Use placeholders: {event_name}, {event_date}, {event_time}, {event_location}"
        hint="Available placeholders: {event_name}, {event_date}, {event_time}, {event_location}"
        style={styles.contentInput}
      />

      <Text style={styles.sectionTitle}>Scheduling options</Text>
      <AcctField
        label="Send before event (days)"
        value={sendBeforeDays}
        onChangeText={v => setSendBeforeDays(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        placeholder="e.g., 7 for one week before"
        hint="Leave empty for manual scheduling only"
      />
      <DateTimeField mode="time" label="Send time" value={sendTime} onChange={setSendTime} placeholder="Select send time" clearable />
      <AcctField
        label="Repeat every (days)"
        value={repeatIntervalDays}
        onChangeText={v => setRepeatIntervalDays(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        placeholder="e.g., 7 for weekly reminders"
        hint="Leave empty for one-time messages. Use with “Send before event” for recurring reminders."
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Auto-send when new events are created (applies scheduling rules automatically)</Text>
        <Switch value={autoSend} onValueChange={setAutoSend} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.surface} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Template is active</Text>
        <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.surface} />
      </View>

      <AppButton title={isNew ? 'Create template' : 'Save changes'} onPress={handleSave} loading={saving} style={styles.saveBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  block: { marginBottom: 16 },
  contentInput: { minHeight: 130 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 12 },
  switchText: { flex: 1, fontSize: 14, color: Colors.textPrimary, marginRight: 10 },
  saveBtn: { marginTop: 8 },
});
