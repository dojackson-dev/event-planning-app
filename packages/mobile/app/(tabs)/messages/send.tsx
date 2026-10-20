import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import AcctField from '@/components/AcctField';
import AcctSelect, { AcctSelectOption } from '@/components/AcctSelect';
import AcctChips from '@/components/AcctChips';

type RecipientType = 'client' | 'guest' | 'security' | 'custom';
type MessageType = 'confirmation' | 'reminder' | 'support' | 'announcement' | 'invoice' | 'update' | 'custom';

interface EventOption {
  id: string;
  name: string;
  date: string;
  startTime?: string | null;
  venue?: string | null;
  location?: string | null;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  smsOptIn: boolean;
  preferredContact?: string;
}

interface GuestOption {
  id: number | string;
  name: string;
  phone: string | null;
}

interface SavedTemplate {
  id: string;
  name: string;
  messageType: string;
  content: string;
}

const RECIPIENT_TYPES: { value: RecipientType; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'guest', label: 'Guest' },
  { value: 'security', label: 'Security' },
  { value: 'custom', label: 'Custom' },
];

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'support', label: 'Support' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'update', label: 'Update' },
  { value: 'custom', label: 'Custom' },
];

const PHONE_PREFIXES = [
  { value: '+1', label: '+1' },
  { value: '+44', label: '+44' },
  { value: '+52', label: '+52' },
  { value: '+1868', label: '+1868' },
];

const STOP_FOOTER = ' Reply STOP to unsubscribe.';
const MESSAGE_TYPE_VALUES = MESSAGE_TYPES.map(t => t.value) as string[];

// Normalise a phone to E.164 (+1XXXXXXXXXX for US numbers) — same rules as the web send page.
const toE164 = (phone: string, prefix = '+1'): string => {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return phone;
  if (digits.length === 10) return `${prefix}${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
};

const parseLocalDate = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00` : s);

export default function SendMessageScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();

  const [bootLoading, setBootLoading] = useState(true);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);

  const [recipientType, setRecipientType] = useState<RecipientType>('client');
  const [eventId, setEventId] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [clientId, setClientId] = useState('');
  const [guestId, setGuestId] = useState('');
  const [customName, setCustomName] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+1');
  const [messageType, setMessageType] = useState<MessageType>('confirmation');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const warnings: string[] = [];
      const [ev, cl, tpl] = await Promise.all([
        apiRequest<EventOption[]>('/events').catch(() => { warnings.push('events'); return [] as EventOption[]; }),
        apiRequest<ClientOption[]>('/users?role=customer').catch(() => { warnings.push('clients'); return [] as ClientOption[]; }),
        apiRequest<SavedTemplate[]>('/message-templates/active').catch(() => [] as SavedTemplate[]),
      ]);
      if (cancelled) return;
      setEvents(Array.isArray(ev) ? ev : []);
      setClients(Array.isArray(cl) ? cl : []);
      setTemplates(Array.isArray(tpl) ? tpl : []);
      setLoadWarning(warnings.length ? `Could not load ${warnings.join(' and ')}. Pull back and reopen to retry.` : null);
      setBootLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setGuests([]);
    setGuestId('');
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiRequest<any>(`/guest-lists/by-event/${eventId}`);
        let rows: GuestOption[] = Array.isArray(list?.guests) ? list.guests : [];
        if (rows.length === 0 && list?.id != null) {
          rows = await apiRequest<GuestOption[]>(`/guest-lists/${list.id}/guests`).catch(() => []);
        }
        if (!cancelled) setGuests(rows);
      } catch {
        if (!cancelled) setGuests([]);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const selectedEvent = events.find(e => e.id === eventId);
  const selectedClient = clients.find(c => c.id === clientId);
  const selectedGuest = guests.find(g => String(g.id) === guestId);

  const eventOptions: AcctSelectOption[] = useMemo(() => events.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: e.date ? parseLocalDate(e.date).toLocaleDateString() : undefined,
  })), [events]);

  const clientOptions: AcctSelectOption[] = useMemo(() => clients.map(c => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName}`.trim() || c.email || 'Unnamed client',
    sublabel: [c.phone || '(no phone)', c.email].filter(Boolean).join(' · '),
  })), [clients]);

  const guestOptions: AcctSelectOption[] = useMemo(() => guests.map(g => ({
    value: String(g.id),
    label: g.name,
    sublabel: g.phone || '(no phone)',
  })), [guests]);

  const templateOptions: AcctSelectOption[] = useMemo(() => templates.map(t => ({
    value: t.id,
    label: t.name,
    sublabel: t.content,
  })), [templates]);

  const fillPlaceholders = useCallback((text: string) => {
    if (!selectedEvent) return text;
    const when = selectedEvent.date ? parseLocalDate(selectedEvent.date) : null;
    return text
      .replace(/\{event_name\}/g, selectedEvent.name)
      .replace(/\{event_date\}/g, when ? when.toLocaleDateString() : '{event_date}')
      .replace(/\{event_time\}/g, selectedEvent.startTime || '{event_time}')
      .replace(/\{event_location\}/g, selectedEvent.venue || selectedEvent.location || '{event_location}');
  }, [selectedEvent]);

  const getMessageTemplate = (type: MessageType) => {
    const eventName = selectedEvent?.name ?? '[Event Name]';
    const venue = selectedEvent?.venue ?? '[Venue Name]';
    const when = selectedEvent?.date ? parseLocalDate(selectedEvent.date) : null;
    const dateStr = when ? when.toLocaleDateString() : '[Date]';
    const timeStr = selectedEvent?.startTime || '[Time]';
    switch (type) {
      case 'confirmation': return `EventEcos: Your registration for ${eventName} on ${dateStr} is confirmed.${STOP_FOOTER}`;
      case 'reminder': return `Reminder: ${eventName} starts at ${timeStr} at ${venue}.${STOP_FOOTER}`;
      case 'support': return `EventEcos Support: We received your request and will respond shortly.${STOP_FOOTER}`;
      case 'announcement': return `EventEcos: New events are now available in your area. View at eventecos.com.${STOP_FOOTER}`;
      case 'invoice': return `EventEcos: Your invoice has been updated. For assistance, contact support@eventecos.com.${STOP_FOOTER}`;
      case 'update': return `EventEcos: We have an update regarding ${eventName}. For assistance, contact support@eventecos.com.${STOP_FOOTER}`;
      default: return '';
    }
  };

  const applyText = (text: string) => {
    if (content.trim() && content.trim() !== text.trim()) {
      Alert.alert('Replace message?', 'Replace the current message text?', [
        { text: 'Keep current', style: 'cancel' },
        { text: 'Replace', onPress: () => setContent(text) },
      ]);
    } else {
      setContent(text);
    }
  };

  const applySavedTemplate = (id: string) => {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    if (MESSAGE_TYPE_VALUES.includes(t.messageType)) setMessageType(t.messageType as MessageType);
    applyText(fillPlaceholders(t.content));
  };

  // Deep-link from the templates screen ("Use in message").
  useEffect(() => {
    if (!templateId || bootLoading) return;
    const t = templates.find(x => x.id === templateId);
    if (t) {
      if (MESSAGE_TYPE_VALUES.includes(t.messageType)) setMessageType(t.messageType as MessageType);
      setContent(t.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, bootLoading]);

  const changeRecipientType = (value: RecipientType) => {
    setRecipientType(value);
    setClientId('');
    setGuestId('');
    setCustomName('');
    setRawPhone('');
    setSendToAll(false);
  };

  const canSendToAll = recipientType === 'client' || (recipientType === 'guest' && !!eventId);
  const missingStop = !!content && !content.toLowerCase().includes('reply stop to unsubscribe');

  const resetForm = () => {
    setContent('');
    setClientId('');
    setGuestId('');
    setCustomName('');
    setRawPhone('');
  };

  const handleSend = async () => {
    if (!content.trim()) { Alert.alert('Validation', 'Please enter a message.'); return; }
    setSending(true);
    try {
      if (sendToAll) {
        const batch = recipientType === 'client'
          ? clients.filter(c => c.phone && c.smsOptIn).map(c => ({
              recipientPhone: toE164(c.phone as string),
              recipientName: `${c.firstName} ${c.lastName}`.trim(),
              recipientType: 'client',
            }))
          : guests.filter(g => g.phone).map(g => ({
              recipientPhone: toE164(g.phone as string),
              recipientName: g.name,
              recipientType: 'guest',
            }));
        if (batch.length === 0) {
          Alert.alert(
            'No recipients',
            recipientType === 'client'
              ? 'No opted-in clients with phone numbers found. Clients must consent to SMS before receiving messages.'
              : 'No guests with phone numbers found for this event.',
          );
          return;
        }
        // Clients are intake-form contacts (opt-in filtered above), so the opt-in gate is skipped as on the single-send path.
        const results = await apiRequest<{ status?: string }[]>('/messages/send-bulk', {
          method: 'POST',
          body: {
            messages: batch.map(b => ({
              ...b,
              eventId: eventId || undefined,
              messageType,
              content: content.trim(),
              skipOptInCheck: b.recipientType === 'client',
            })),
          },
        });
        const list = Array.isArray(results) ? results : [];
        const failed = list.filter(r => r?.status === 'failed').length;
        const ok = list.length - failed;
        Alert.alert(
          failed ? 'Sent with errors' : 'Messages sent',
          `${ok} of ${batch.length} message(s) sent${failed ? `, ${failed} failed` : ''}.`,
          [{ text: 'Done', onPress: () => router.back() }],
        );
        return;
      }

      let phone = '';
      let name = '';
      if (recipientType === 'client') {
        if (!selectedClient) { Alert.alert('Validation', 'Please select a client.'); return; }
        phone = selectedClient.phone ? toE164(selectedClient.phone) : '';
        name = `${selectedClient.firstName} ${selectedClient.lastName}`.trim();
        if (!phone) { Alert.alert('Validation', 'This client has no phone number on file — SMS cannot be sent.'); return; }
      } else if (recipientType === 'guest') {
        if (!selectedGuest) { Alert.alert('Validation', 'Please select a guest.'); return; }
        phone = selectedGuest.phone ? toE164(selectedGuest.phone) : '';
        name = selectedGuest.name;
        if (!phone) { Alert.alert('Validation', 'This guest has no phone number.'); return; }
      } else {
        phone = toE164(rawPhone, phonePrefix);
        name = customName.trim();
        if (!name || !rawPhone) { Alert.alert('Validation', 'Please fill in all recipient fields.'); return; }
      }

      const sent = await apiRequest<{ status?: string; errorMessage?: string }>('/messages/send', {
        method: 'POST',
        body: {
          recipientPhone: phone,
          recipientName: name,
          recipientType,
          eventId: eventId || undefined,
          messageType,
          content: content.trim(),
          // Intake-form clients voluntarily provided their number — skip the opt-in gate, as on web.
          skipOptInCheck: recipientType === 'client',
        },
      });

      // The backend returns 200 with status "failed" when Twilio rejects the SMS.
      if (sent?.status === 'failed') {
        Alert.alert('Message failed', sent.errorMessage || 'The SMS could not be delivered.');
        return;
      }
      Alert.alert('Message sent', `Message sent to ${name} (${phone}).`, [
        { text: 'Send another', onPress: resetForm },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Failed to send message', err?.message || 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  if (bootLoading) return <LoadingState message="Loading…" />;

  const clientPref = selectedClient?.preferredContact;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {loadWarning ? <Text style={styles.warning}>{loadWarning}</Text> : null}

      <Text style={styles.label}>Recipient type *</Text>
      <View style={styles.block}>
        <AcctChips options={RECIPIENT_TYPES} value={recipientType} onChange={changeRecipientType} />
      </View>

      <AcctSelect
        label="Associated event (optional)"
        value={eventId}
        options={eventOptions}
        onChange={setEventId}
        placeholder="Select an event…"
        emptyLabel="— None —"
      />

      {canSendToAll && (
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {recipientType === 'client'
              ? 'Send to all opted-in clients'
              : `Send to all guests in event (${guests.length})`}
          </Text>
          <Switch value={sendToAll} onValueChange={setSendToAll} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.surface} />
        </View>
      )}

      {!sendToAll && recipientType === 'client' && (
        <>
          <AcctSelect
            label="Select client"
            value={clientId}
            options={clientOptions}
            onChange={setClientId}
            placeholder={clients.length ? 'Select a client…' : 'No clients found'}
            required
          />
          {selectedClient && (
            <View style={styles.infoBox}>
              {clientPref ? <Text style={styles.infoText}>Preferred contact: {clientPref}</Text> : null}
              {selectedClient.phone ? <Text style={styles.infoText}>Phone: {toE164(selectedClient.phone)}</Text> : (
                <Text style={styles.infoWarn}>No phone number on file — SMS cannot be sent.</Text>
              )}
              {selectedClient.email ? <Text style={styles.infoText}>Email: {selectedClient.email}</Text> : null}
              {clientPref === 'email' && (
                <Text style={styles.infoWarn}>This client prefers email. The message will still be sent via SMS.</Text>
              )}
            </View>
          )}
        </>
      )}

      {!sendToAll && recipientType === 'guest' && (
        <AcctSelect
          label="Select guest"
          value={guestId}
          options={guestOptions}
          onChange={setGuestId}
          placeholder={eventId ? (guests.length ? 'Select a guest…' : 'No guests found') : 'Select an event first'}
          disabled={!eventId}
          required
        />
      )}

      {!sendToAll && (recipientType === 'custom' || recipientType === 'security') && (
        <>
          <AcctField label="Recipient name" required value={customName} onChangeText={setCustomName} placeholder="Enter recipient name" />
          <Text style={styles.label}>Phone number *</Text>
          <View style={styles.block}>
            <AcctChips options={PHONE_PREFIXES} value={phonePrefix} onChange={setPhonePrefix} />
          </View>
          <AcctField
            label=""
            value={rawPhone}
            onChangeText={v => setRawPhone(v.replace(/\D/g, ''))}
            placeholder="5551234567"
            keyboardType="phone-pad"
            maxLength={10}
            hint="US +1 is pre-selected. Enter the 10-digit number without dashes."
          />
        </>
      )}

      <Text style={styles.label}>Message type *</Text>
      <View style={styles.block}>
        <AcctChips options={MESSAGE_TYPES} value={messageType} onChange={setMessageType} />
      </View>

      <View style={styles.templateRow}>
        {messageType !== 'custom' && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => applyText(getMessageTemplate(messageType))}>
            <Ionicons name="flash-outline" size={14} color={Colors.primary} />
            <Text style={styles.linkText}>Use template for {messageType}</Text>
          </TouchableOpacity>
        )}
      </View>

      {templates.length > 0 && (
        <AcctSelect
          label="Saved templates"
          value=""
          options={templateOptions}
          onChange={applySavedTemplate}
          placeholder="Use a saved template…"
        />
      )}

      <AcctField
        label="Message content"
        required
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        placeholder="Enter your message here…"
        style={styles.messageInput}
        hint={`${content.length} characters (SMS segments: ${Math.ceil(content.length / 160)})`}
      />
      {missingStop && (
        <View style={styles.stopRow}>
          <Text style={styles.stopText}>Campaign compliance requires "Reply STOP to unsubscribe."</Text>
          <TouchableOpacity onPress={() => setContent(c => c.trimEnd() + STOP_FOOTER)}>
            <Text style={styles.linkText}>Add it</Text>
          </TouchableOpacity>
        </View>
      )}

      <AppButton
        title={sendToAll ? 'Send to multiple recipients' : 'Send message'}
        onPress={handleSend}
        loading={sending}
        style={styles.sendBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  warning: { color: Colors.warningText, backgroundColor: Colors.warningLight, padding: 10, borderRadius: Radius.md, marginBottom: 12, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  block: { marginBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 16 },
  switchText: { flex: 1, fontSize: 14, color: Colors.textPrimary, marginRight: 10 },
  infoBox: { backgroundColor: Colors.infoLight, borderRadius: Radius.md, padding: 12, marginTop: -8, marginBottom: 16, gap: 2 },
  infoText: { fontSize: 13, color: Colors.infoText },
  infoWarn: { fontSize: 13, color: Colors.warningText },
  templateRow: { marginTop: -6, marginBottom: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  messageInput: { minHeight: 130 },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, backgroundColor: Colors.warningLight, borderRadius: Radius.md, padding: 10, marginTop: -8, marginBottom: 16 },
  stopText: { flex: 1, fontSize: 12, color: Colors.warningText },
  sendBtn: { marginTop: 4 },
});
