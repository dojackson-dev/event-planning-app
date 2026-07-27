import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface EventOption {
  id: string;
  name: string;
  date: string;
  intake_form_id?: string | null;
  intake_form?: { contact_name?: string; contact_phone?: string; event_name?: string } | null;
}

const MESSAGE_TYPES = [
  { value: 'confirmation', label: 'Booking Confirmation', icon: 'checkmark-circle-outline', template: 'Your booking has been confirmed! We look forward to serving you.' },
  { value: 'reminder', label: 'Event Reminder', icon: 'alarm-outline', template: 'This is a friendly reminder about your upcoming event. Please let us know if you have any questions.' },
  { value: 'invoice', label: 'Invoice Notice', icon: 'receipt-outline', template: 'Your invoice is ready. Please review and let us know if you have any questions about the charges.' },
  { value: 'update', label: 'Event Update', icon: 'information-circle-outline', template: 'We have an update regarding your event. Please contact us at your earliest convenience.' },
  { value: 'custom', label: 'Custom Message', icon: 'chatbubble-ellipses-outline', template: '' },
];

export default function SendMessageScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedType, setSelectedType] = useState('custom');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('event')
      .select('id, name, date, intake_form_id, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, event_name)')
      .eq('owner_id', user.id)
      .order('date', { ascending: false });
    setEvents((data as unknown as EventOption[]) || []);
  };

  const selectEvent = (ev: EventOption) => {
    setSelectedEventId(ev.id);
    setRecipientPhone(ev.intake_form?.contact_phone || '');
    setShowEventPicker(false);
  };

  const selectType = (value: string) => {
    setSelectedType(value);
    const template = MESSAGE_TYPES.find(t => t.value === value)?.template || '';
    if (template && content.trim() === '') setContent(template);
    else if (template) {
      Alert.alert('Use Template?', 'Replace current message with template?', [
        { text: 'Keep Current', style: 'cancel' },
        { text: 'Use Template', onPress: () => setContent(template) },
      ]);
    }
  };

  const handleSend = async () => {
    if (!recipientPhone.trim()) {
      Alert.alert('Validation', 'Please enter a recipient phone number.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Validation', 'Please enter a message.');
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const selectedEvent = events.find(e => e.id === selectedEventId);

      await apiRequest('/messages/send', {
        method: 'POST',
        body: {
          recipientType: 'client',
          messageType: selectedType,
          userId: user.id,
          eventId: selectedEventId || undefined,
          recipientPhone: recipientPhone.trim(),
          content: content.trim(),
        },
      });

      Alert.alert('Message Sent!', `Message delivered to ${recipientPhone}`, [
        { text: 'Send Another', onPress: () => { setContent(''); setRecipientPhone(''); setSelectedEventId(''); } },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectedEventLabel = (() => {
    const ev = events.find(e => e.id === selectedEventId);
    if (!ev) return '';
    return `${ev.intake_form?.event_name || ev.name} — ${new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Event selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Event (Optional)</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setShowEventPicker(v => !v)}>
          <Text style={[styles.selectText, !selectedEventId && styles.placeholder]}>
            {selectedEventId ? selectedEventLabel : 'Select event to auto-fill phone'}
          </Text>
          <Ionicons name={showEventPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {showEventPicker && (
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSelectedEventId(''); setRecipientPhone(''); setShowEventPicker(false); }}>
              <Text style={styles.dropdownText}>— None —</Text>
            </TouchableOpacity>
            {events.map(ev => (
              <TouchableOpacity key={ev.id} style={styles.dropdownItem} onPress={() => selectEvent(ev)}>
                <Text style={styles.dropdownText} numberOfLines={1}>{ev.intake_form?.event_name || ev.name}</Text>
                {ev.intake_form?.contact_name && <Text style={styles.dropdownSub}>{ev.intake_form.contact_name} · {ev.intake_form.contact_phone || 'No phone'}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Recipient phone */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Recipient Phone *</Text>
        <TextInput
          style={styles.input}
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      {/* Message type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Message Type</Text>
        <View style={styles.typeGrid}>
          {MESSAGE_TYPES.map(type => (
            <TouchableOpacity
              key={type.value}
              style={[styles.typeBtn, selectedType === type.value && styles.typeBtnSelected]}
              onPress={() => selectType(type.value)}
            >
              <Ionicons
                name={type.icon as any}
                size={20}
                color={selectedType === type.value ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.typeBtnText, selectedType === type.value && styles.typeBtnTextSelected]} numberOfLines={2}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Message content */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Message *</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={content}
          onChangeText={setContent}
          placeholder="Type your message here..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={5}
        />
        <Text style={styles.charCount}>{content.length} characters</Text>
      </View>

      <TouchableOpacity
        style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={sending}
      >
        {sending ? <ActivityIndicator color="#FFF" size="small" /> : (
          <><Ionicons name="send" size={18} color="#FFF" /><Text style={styles.sendBtnText}>Send Message</Text></>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selectBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textMuted },
  dropdown: { backgroundColor: Colors.surface, borderRadius: Radius.md, marginTop: 4, borderWidth: 1, borderColor: Colors.border, maxHeight: 220, ...Shadow.md },
  dropdownItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  dropdownText: { fontSize: 14, color: Colors.textPrimary },
  dropdownSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary },
  messageInput: { height: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 6 },
  typeBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  typeBtnText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', fontWeight: '500' },
  typeBtnTextSelected: { color: Colors.primary, fontWeight: '700' },
  sendBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
