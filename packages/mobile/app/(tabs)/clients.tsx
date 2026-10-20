import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput,
  Alert, Linking, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import DateTimeField from '@/components/DateTimeField';
import {
  IntakeForm, leadStatus, leadTone, formatDate, formatTime, formatEventType,
  titleCase, errorMessage, parseLocalDate,
} from '@/components/CrmShared';

type Filter = 'all' | 'unactivated' | 'new' | 'contacted' | 'converted';

const FILTERS: Filter[] = ['all', 'unactivated', 'new', 'contacted', 'converted'];

const filterLabel = (f: Filter) => (f === 'unactivated' ? 'New Leads' : titleCase(f));

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const [messageClient, setMessageClient] = useState<IntakeForm | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const [apptClient, setApptClient] = useState<IntakeForm | null>(null);
  const [appt, setAppt] = useState({ date: '', time: '10:00', duration: '60', notes: '' });
  const [scheduling, setScheduling] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const data = await apiRequest<IntakeForm[]>('/intake-forms');
      setClients(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load clients.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchClients(); }, [fetchClients]));

  const onRefresh = () => { setRefreshing(true); fetchClients(); };

  const counts = useMemo(() => ({
    all: clients.length,
    unactivated: clients.filter((c) => c.status !== 'converted').length,
    new: clients.filter((c) => c.status === 'new').length,
    contacted: clients.filter((c) => c.status === 'contacted').length,
    converted: clients.filter((c) => c.status === 'converted').length,
  }), [clients]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const time = (c: IntakeForm) => (parseLocalDate(c.event_date)?.getTime() ?? 0);
    return clients
      .filter((c) => {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'unactivated' ? c.status !== 'converted' : c.status === filter);
        const matchesSearch =
          !q ||
          (c.contact_name ?? '').toLowerCase().includes(q) ||
          (c.contact_email ?? '').toLowerCase().includes(q) ||
          (c.contact_phone ?? '').includes(search.trim());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const aExpired = time(a) < start.getTime();
        const bExpired = time(b) < start.getTime();
        if (aExpired === bExpired) return aExpired ? time(b) - time(a) : time(a) - time(b);
        return aExpired ? 1 : -1;
      });
  }, [clients, filter, search]);

  const activateLead = (client: IntakeForm) => {
    Alert.alert('Activate Lead', `Activate "${client.contact_name}" as a booking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate',
        onPress: async () => {
          setActivatingId(client.id);
          try {
            await apiRequest(`/intake-forms/${client.id}/convert-to-booking`, { method: 'POST', body: {} });
            setClients((prev) => prev.map((c) =>
              c.id === client.id ? { ...c, status: 'converted', display_status: 'active' } : c));
          } catch (err) {
            Alert.alert('Error', errorMessage(err, 'Failed to activate lead'));
          } finally {
            setActivatingId(null);
          }
        },
      },
    ]);
  };

  const deleteClient = (client: IntakeForm) => {
    Alert.alert('Delete Client', `Delete "${client.contact_name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/intake-forms/${client.id}`, { method: 'DELETE' });
            setClients((prev) => prev.filter((c) => c.id !== client.id));
          } catch (err) {
            Alert.alert('Error', errorMessage(err, 'Failed to delete client'));
          }
        },
      },
    ]);
  };

  const openMessage = (client: IntakeForm) => {
    if (!client.contact_phone) {
      Alert.alert('No phone number', 'This client has no phone number on file. SMS cannot be sent.');
      return;
    }
    setMessageText('');
    setMessageClient(client);
  };

  const sendMessage = async () => {
    if (!messageClient || !messageText.trim()) return;
    setSending(true);
    try {
      await apiRequest('/messages/send', {
        method: 'POST',
        body: {
          recipientPhone: messageClient.contact_phone,
          recipientName: messageClient.contact_name,
          recipientType: 'client',
          messageType: 'custom',
          content: messageText,
          skipOptInCheck: true,
        },
      });
      setMessageClient(null);
      setMessageText('');
      Alert.alert('Sent', 'SMS sent successfully!');
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Failed to send SMS'));
    } finally {
      setSending(false);
    }
  };

  const openAppointment = (client: IntakeForm) => {
    setAppt({ date: todayLocal(), time: '10:00', duration: '60', notes: '' });
    setApptClient(client);
  };

  const scheduleAppointment = async () => {
    if (!apptClient) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appt.date) || !/^\d{1,2}:\d{2}$/.test(appt.time)) {
      Alert.alert('Check details', 'Select a valid date and time.');
      return;
    }
    setScheduling(true);
    try {
      await apiRequest('/appointments', {
        method: 'POST',
        body: {
          intake_form_id: apptClient.id,
          client_name: apptClient.contact_name,
          client_email: apptClient.contact_email,
          client_phone: apptClient.contact_phone || null,
          appointment_date: appt.date,
          appointment_time: appt.time,
          duration_minutes: parseInt(appt.duration, 10) || 60,
          notes: appt.notes || null,
          status: 'scheduled',
        },
      });
      setApptClient(null);
      Alert.alert('Scheduled', 'Appointment scheduled successfully!');
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Failed to create appointment'));
    } finally {
      setScheduling(false);
    }
  };

  const renderClient = ({ item }: { item: IntakeForm }) => {
    const status = leadStatus(item);
    const tone = leadTone(status);
    const time = item.event_time
      ? ` · ${formatTime(item.event_time)}${item.event_end_time ? ` – ${formatTime(item.event_end_time)}` : ''}`
      : '';
    return (
      <View style={[styles.card, Shadow.sm]}>
        <View style={[styles.stripe, { backgroundColor: tone.stripe }]} />
        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.contact_name}</Text>
              <Text style={styles.eventName} numberOfLines={1}>
                {item.event_name || formatEventType(item.event_type)}
              </Text>
              {!!item.contact_email && (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.meta} numberOfLines={1}>{item.contact_email}</Text>
                </View>
              )}
              {!!item.contact_phone && (
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.meta}>{item.contact_phone}</Text>
                </View>
              )}
            </View>
            <View style={styles.topRight}>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>{titleCase(status)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => deleteClient(item)}
                style={styles.deleteBtn}
                accessibilityLabel={`Delete ${item.contact_name}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailBox}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.detailText}>{formatDate(item.event_date)}{time}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.detailText}>{item.guest_count ?? 0} guests</Text>
              {!!item.budget_range && <Text style={styles.budget} numberOfLines={1}>💰 {item.budget_range}</Text>}
            </View>
          </View>

          {!!item.created_at && (
            <Text style={styles.submitted}>Submitted {formatDate(item.created_at)}</Text>
          )}

          <View style={styles.actions}>
            {item.status !== 'converted' && (
              <AppButton
                title="Activate Lead"
                onPress={() => activateLead(item)}
                loading={activatingId === item.id}
                style={styles.activateBtn}
              />
            )}
            {item.status === 'converted' && !!item.event_id && (
              <AppButton
                title="View Event"
                onPress={() => router.push(`/(tabs)/events/${item.event_id}` as any)}
              />
            )}
            <View style={styles.actionRow}>
              <ActionChip icon="chatbubble-outline" label="Message" onPress={() => openMessage(item)} />
              <ActionChip icon="time-outline" label="Schedule" onPress={() => openAppointment(item)} />
            </View>
            <View style={styles.actionRow}>
              <ActionChip
                icon="call-outline"
                label={item.contact_phone ? 'Call' : 'No phone'}
                disabled={!item.contact_phone}
                onPress={() => Linking.openURL(`tel:${item.contact_phone}`)}
              />
              <ActionChip
                icon="mail-outline"
                label={item.contact_email ? 'Email' : 'No email'}
                disabled={!item.contact_email}
                onPress={() => Linking.openURL(`mailto:${item.contact_email}`)}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingState message="Loading clients..." />;

  if (error && clients.length === 0) {
    return (
      <View style={styles.errorWrap}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load clients" message={error} />
        <AppButton title="Retry" onPress={() => { setLoading(true); fetchClients(); }} style={{ marginHorizontal: 32 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>{clients.length} total</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, or phone…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {filterLabel(f)} ({counts[f]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!!error && <Text style={styles.inlineError}>{error} Pull down to retry.</Text>}

      <FlatList
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No clients found"
            message={clients.length === 0 ? 'Leads from your intake form will appear here.' : 'Try adjusting your search or filter.'}
          />
        }
      />

      <Modal visible={!!messageClient} transparent animationType="slide" onRequestClose={() => setMessageClient(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Send Message</Text>
              <TouchableOpacity onPress={() => setMessageClient(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.recipient}>
              <Text style={styles.recipientName}>{messageClient?.contact_name}</Text>
              <Text style={styles.meta}>{messageClient?.contact_phone}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your message here…"
              placeholderTextColor={Colors.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <View style={styles.sheetButtons}>
              <AppButton title="Cancel" variant="outline" onPress={() => setMessageClient(null)} style={styles.flex1} />
              <AppButton
                title="Send SMS"
                onPress={sendMessage}
                loading={sending}
                disabled={!messageText.trim()}
                style={styles.flex1}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!apptClient} transparent animationType="slide" onRequestClose={() => setApptClient(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Schedule Appointment</Text>
              <TouchableOpacity onPress={() => setApptClient(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.recipient}>
              <Text style={styles.recipientName}>{apptClient?.contact_name}</Text>
              <Text style={styles.meta}>{apptClient?.contact_email}</Text>
            </View>
            <DateTimeField mode="date" label="Date" value={appt.date} onChange={(v) => setAppt((p) => ({ ...p, date: v }))} />
            <View style={styles.sheetButtons}>
              <View style={styles.flex1}>
                <DateTimeField mode="time" label="Time" value={appt.time} onChange={(v) => setAppt((p) => ({ ...p, time: v }))} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  value={appt.duration}
                  onChangeText={(v) => setAppt((p) => ({ ...p, duration: v }))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesArea]}
              value={appt.notes}
              onChangeText={(v) => setAppt((p) => ({ ...p, notes: v }))}
              placeholder="Optional notes"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <View style={styles.sheetButtons}>
              <AppButton title="Cancel" variant="outline" onPress={() => setApptClient(null)} style={styles.flex1} />
              <AppButton
                title="Schedule"
                onPress={scheduleAppointment}
                loading={scheduling}
                disabled={!appt.date || !appt.time}
                style={styles.flex1}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ActionChip({
  icon, label, onPress, disabled,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.chip, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={disabled ? Colors.textMuted : Colors.primary} />
      <Text style={[styles.chipText, disabled && { color: Colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorWrap: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  count: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.borderLight,
    borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  filterRow: { gap: 8, paddingTop: 10 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.textWhite },
  inlineError: { color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, fontSize: 13, textAlign: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden' },
  stripe: { height: 4, width: '100%' },
  cardBody: { padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', gap: 8 },
  topRight: { alignItems: 'flex-end', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 12, fontWeight: '600', color: Colors.primary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  meta: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  detailBox: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: 10, gap: 2 },
  detailText: { fontSize: 13, color: Colors.textSecondary },
  budget: { fontSize: 12, color: Colors.textSecondary, marginLeft: 8, flexShrink: 1 },
  submitted: { fontSize: 11, color: Colors.textMuted },
  actions: { gap: 8 },
  activateBtn: { backgroundColor: Colors.success },
  actionRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: Radius.lg, backgroundColor: Colors.primaryLight,
  },
  chipDisabled: { backgroundColor: Colors.borderLight },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: 20, paddingBottom: 32,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  recipient: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: 12, marginBottom: 12 },
  recipientName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  textArea: { height: 110, textAlignVertical: 'top' },
  notesArea: { height: 70, textAlignVertical: 'top' },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 14 },
  flex1: { flex: 1 },
});
