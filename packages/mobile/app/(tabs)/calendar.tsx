import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, RefreshControl, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EvtErrorState from '@/components/EvtErrorState';
import AppButton from '@/components/AppButton';
import EvtField from '@/components/EvtField';
import DateTimeField from '@/components/DateTimeField';
import {
  parseLocalDate, toDateKey, formatTime, formatDate, titleCase, isValidDateInput, isValidTimeInput,
} from '@/components/EvtDate';

type EntryKind = 'event' | 'inquiry' | 'appointment';

interface CalEntry {
  key: string;
  kind: EntryKind;
  refId: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  venue?: string | null;
  venueId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  maxGuests?: number | null;
}

interface OwnerVenue { id: string; name: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Appointment color has no theme token (web uses teal).
const TEAL = '#14B8A6';

const entryColor = (e: CalEntry) => {
  if (e.kind === 'appointment') return TEAL;
  if (e.kind === 'inquiry') return Colors.purple;
  if (e.status === 'scheduled') return Colors.success;
  if (e.status === 'draft') return Colors.warning;
  return Colors.primary;
};

const kindLabel = (e: CalEntry) =>
  e.kind === 'appointment' ? 'Appointment' : e.kind === 'inquiry' ? 'Inquiry' : 'Event';

const startOfWeek = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [view, setView] = useState<'month' | 'week'>('month');
  const [entries, setEntries] = useState<CalEntry[]>([]);
  const [venues, setVenues] = useState<OwnerVenue[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partialWarning, setPartialWarning] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Appointment modal
  const [apptOpen, setApptOpen] = useState(false);
  const [apptName, setApptName] = useState('');
  const [apptEmail, setApptEmail] = useState('');
  const [apptPhone, setApptPhone] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('10:00');
  const [apptDuration, setApptDuration] = useState('60');
  const [apptNotes, setApptNotes] = useState('');
  const [apptErrors, setApptErrors] = useState<Record<string, string>>({});
  const [apptSaving, setApptSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setPartialWarning('');
      const [evRes, intakeRes, apptRes, venRes] = await Promise.allSettled([
        apiRequest<any[]>('/events'),
        apiRequest<any[]>('/intake-forms'),
        apiRequest<any[]>('/appointments'),
        apiRequest<{ venues: OwnerVenue[] }>('/owner/venues'),
      ]);
      if (evRes.status === 'rejected') throw evRes.reason;

      const eventEntries: CalEntry[] = (evRes.value || [])
        .filter((ev: any) => ev?.date)
        .map((ev: any) => ({
          key: `event-${ev.id}`,
          kind: 'event' as const,
          refId: String(ev.id),
          name: ev.name || 'Event',
          date: String(ev.date).slice(0, 10),
          startTime: ev.startTime ?? ev.start_time,
          endTime: ev.endTime ?? ev.end_time,
          status: ev.status,
          venue: ev.venue,
          venueId: ev.venueId ?? ev.venue_id,
          clientName: ev.clientName,
          maxGuests: ev.maxGuests ?? ev.guest_count,
        }));

      // Open inquiries only — converted ones already exist as events.
      const inquiryEntries: CalEntry[] = intakeRes.status === 'fulfilled'
        ? (intakeRes.value || [])
            .filter((f: any) => f.event_date && (f.status === 'new' || f.status === 'contacted'))
            .map((f: any) => ({
              key: `intake-${f.id}`,
              kind: 'inquiry' as const,
              refId: String(f.id),
              name: f.event_type ? titleCase(f.event_type) : 'Inquiry',
              date: String(f.event_date).slice(0, 10),
              startTime: f.event_time,
              status: f.status,
              clientName: f.contact_name,
              clientEmail: f.contact_email,
              clientPhone: f.contact_phone,
            }))
        : [];

      const apptEntries: CalEntry[] = apptRes.status === 'fulfilled'
        ? (apptRes.value || [])
            .filter((a: any) => a.appointment_date && a.status !== 'cancelled')
            .map((a: any) => ({
              key: `appt-${a.id}`,
              kind: 'appointment' as const,
              refId: String(a.id),
              name: a.client_name || 'Appointment',
              date: String(a.appointment_date).slice(0, 10),
              startTime: a.appointment_time,
              status: a.status,
              clientName: a.client_name,
              clientEmail: a.client_email,
              clientPhone: a.client_phone,
              durationMinutes: a.duration_minutes,
              notes: a.notes,
            }))
        : [];

      const failed = [intakeRes, apptRes].filter((r) => r.status === 'rejected').length;
      if (failed) setPartialWarning('Some calendar items (inquiries or appointments) could not be loaded.');

      setEntries([...eventEntries, ...inquiryEntries, ...apptEntries]);
      setVenues(venRes.status === 'fulfilled' ? venRes.value?.venues || [] : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeVenue = venues.find((v) => v.id === venueId) || null;

  const filtered = useMemo(() => {
    if (!activeVenue) return entries;
    // Only events carry a venue; legacy rows store the venue name in venue_id.
    return entries.filter(
      (e) => e.kind !== 'event' || e.venueId === activeVenue.id || e.venueId === activeVenue.name || e.venue === activeVenue.name,
    );
  }, [entries, activeVenue]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return map;
  }, [filtered]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = useMemo(
    () => filtered.filter((e) => e.date.startsWith(monthPrefix)).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || '')),
    [filtered, monthPrefix],
  );

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const keyFor = (day: number) => `${monthPrefix}-${String(day).padStart(2, '0')}`;
  const todayStr = toDateKey(today);

  const shift = (dir: -1 | 1) => {
    setSelectedKey(null);
    if (view === 'month') setCursor(new Date(year, month + dir, 1));
    else setWeekStart((w) => addDays(w, 7 * dir));
  };

  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setWeekStart(startOfWeek(today));
    setSelectedKey(todayStr);
  };

  const openNewEvent = (date?: string | null) =>
    router.push((`/(tabs)/events/new${date ? `?date=${date}` : ''}`) as any);

  const openAppt = (date?: string | null) => {
    setApptDate(date || todayStr);
    setApptName(''); setApptEmail(''); setApptPhone('');
    setApptTime('10:00'); setApptDuration('60'); setApptNotes('');
    setApptErrors({});
    setApptOpen(true);
  };

  const saveAppt = async () => {
    const errs: Record<string, string> = {};
    if (!apptName.trim()) errs.name = 'Client name is required';
    if (!isValidDateInput(apptDate)) errs.date = 'Select a valid date';
    if (!isValidTimeInput(apptTime)) errs.time = 'Select a valid time';
    setApptErrors(errs);
    if (Object.keys(errs).length) return;
    setApptSaving(true);
    try {
      await apiRequest('/appointments', {
        method: 'POST',
        body: {
          client_name: apptName.trim(),
          client_email: apptEmail.trim() || null,
          client_phone: apptPhone.trim() || null,
          appointment_date: apptDate,
          appointment_time: apptTime,
          duration_minutes: parseInt(apptDuration, 10) || 60,
          notes: apptNotes.trim() || null,
          status: 'scheduled',
        },
      });
      setApptOpen(false);
      await load();
    } catch (err: any) {
      Alert.alert('Failed to schedule appointment', err.message || 'Please try again.');
    } finally {
      setApptSaving(false);
    }
  };

  const onEntryPress = (e: CalEntry) => {
    if (e.kind === 'event') router.push(`/(tabs)/events/${e.refId}` as any);
    else setDetail(e);
  };

  const deleteAppointment = (e: CalEntry) => {
    Alert.alert('Delete appointment', 'Remove this appointment from your calendar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await apiRequest(`/appointments/${e.refId}`, { method: 'DELETE' });
            setDetail(null);
            await load();
          } catch (err: any) {
            Alert.alert('Failed to delete', err.message || 'Please try again.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const renderEntry = (e: CalEntry, showDate = false) => {
    const color = entryColor(e);
    const d = parseLocalDate(e.date);
    return (
      <TouchableOpacity key={e.key} style={styles.eventRow} onPress={() => onEntryPress(e)} activeOpacity={0.75}>
        <View style={[styles.colorBar, { backgroundColor: color }]} />
        <View style={styles.dateBox}>
          <Text style={[styles.dateDay, { color }]}>{d?.getDate()}</Text>
          <Text style={styles.dateMon}>{d ? MONTHS[d.getMonth()].slice(0, 3) : ''}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.entryName} numberOfLines={1}>{e.name}</Text>
            {e.kind !== 'event' ? (
              <View style={[styles.kindTag, { backgroundColor: color + '22' }]}>
                <Text style={[styles.kindTagText, { color }]}>{kindLabel(e)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.entryMeta} numberOfLines={1}>
            {[
              e.startTime ? formatTime(e.startTime) : '',
              e.durationMinutes ? `${e.durationMinutes} min` : e.endTime ? `to ${formatTime(e.endTime)}` : '',
              e.clientName && e.kind !== 'appointment' ? e.clientName : '',
              e.venue || '',
            ].filter(Boolean).join('  ·  ') || (showDate ? formatDate(e.date) : '')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingState message="Loading calendar…" />;
  if (error) return <EvtErrorState title="Couldn't load calendar" message={error} onRetry={() => { setLoading(true); load(); }} />;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];
  const headerText = view === 'month'
    ? `${MONTHS[month]} ${year}`
    : `${MONTHS[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} – ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const selectedEntries = selectedKey ? byDate.get(selectedKey) || [] : [];

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.segment}>
          {(['month', 'week'] as const).map((v) => (
            <TouchableOpacity key={v} style={[styles.segBtn, view === v && styles.segBtnActive]} onPress={() => { setView(v); setSelectedKey(null); }}>
              <Text style={[styles.segText, view === v && styles.segTextActive]}>{v === 'month' ? 'Month' : 'Week'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.todayBtn} onPress={goToday}><Text style={styles.todayText}>Today</Text></TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.addBtn} onPress={() => openAppt(selectedKey)}>
          <Ionicons name="time-outline" size={16} color={Colors.textWhite} />
          <Text style={styles.addBtnText}>Appt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.primary }]} onPress={() => openNewEvent(selectedKey)}>
          <Ionicons name="add" size={16} color={Colors.textWhite} />
          <Text style={styles.addBtnText}>Event</Text>
        </TouchableOpacity>
      </View>

      {venues.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueScroll} contentContainerStyle={styles.venueRow}>
          <TouchableOpacity style={[styles.chip, !venueId && styles.chipActive]} onPress={() => setVenueId(null)}>
            <Text style={[styles.chipText, !venueId && styles.chipTextActive]}>All Venues</Text>
          </TouchableOpacity>
          {venues.map((v) => (
            <TouchableOpacity key={v.id} style={[styles.chip, venueId === v.id && styles.chipActive]} onPress={() => setVenueId(v.id)}>
              <Text style={[styles.chipText, venueId === v.id && styles.chipTextActive]}>{v.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => shift(-1)} style={styles.chevron} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{headerText}</Text>
        <TouchableOpacity onPress={() => shift(1)} style={styles.chevron} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {partialWarning ? (
        <View style={styles.warning}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.warningText} />
          <Text style={styles.warningText}>{partialWarning}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        {view === 'month' ? (
          <>
            <View style={styles.dowRow}>
              {DAYS.map((d) => <Text key={d} style={styles.dowText}>{d}</Text>)}
            </View>
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                const k = day ? keyFor(day) : '';
                const dayEntries = day ? byDate.get(k) || [] : [];
                const isToday = k === todayStr;
                const isSelected = !!day && k === selectedKey;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                    disabled={!day}
                    activeOpacity={0.7}
                    onPress={() => setSelectedKey(isSelected ? null : k)}
                  >
                    {day ? (
                      <>
                        <View style={[styles.dayCircle, isToday && styles.todayCircle, isSelected && styles.selectedCircle]}>
                          <Text style={[styles.dayNum, (isToday || isSelected) && styles.dayNumOn]}>{day}</Text>
                        </View>
                        <View style={styles.dotRow}>
                          {dayEntries.slice(0, 3).map((e) => (
                            <View key={e.key} style={[styles.dot, { backgroundColor: entryColor(e) }]} />
                          ))}
                          {dayEntries.length > 3 ? <Text style={styles.more}>+</Text> : null}
                        </View>
                      </>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.list}>
              {selectedKey ? (
                <>
                  <View style={styles.listHead}>
                    <Text style={styles.listTitle}>{formatDate(selectedKey, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => setSelectedKey(null)}><Text style={styles.clear}>Show month</Text></TouchableOpacity>
                  </View>
                  {selectedEntries.length === 0
                    ? <Text style={styles.emptyText}>Nothing scheduled for this day.</Text>
                    : selectedEntries.map((e) => renderEntry(e))}
                </>
              ) : (
                <>
                  <Text style={styles.listTitle}>
                    {monthEntries.length ? `${monthEntries.length} item${monthEntries.length === 1 ? '' : 's'} this month` : 'Nothing scheduled this month'}
                  </Text>
                  {monthEntries.map((e) => renderEntry(e))}
                </>
              )}
            </View>
          </>
        ) : (
          <View style={styles.list}>
            {weekDays.map((d) => {
              const k = toDateKey(d);
              const list = byDate.get(k) || [];
              return (
                <View key={k} style={{ marginBottom: 14 }}>
                  <View style={styles.listHead}>
                    <Text style={[styles.listTitle, k === todayStr && { color: Colors.primary }]}>
                      {DAYS[d.getDay()]}, {MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()}
                    </Text>
                    <TouchableOpacity onPress={() => openNewEvent(k)} hitSlop={8}><Ionicons name="add-circle-outline" size={20} color={Colors.primary} /></TouchableOpacity>
                  </View>
                  {list.length === 0 ? <Text style={styles.emptyText}>—</Text> : list.map((e) => renderEntry(e))}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.legend}>
          {[
            [Colors.success, 'Scheduled'], [Colors.warning, 'Draft'], [Colors.primary, 'Other'],
            [Colors.purple, 'Inquiry'], [TEAL, 'Appointment'],
          ].map(([c, l]) => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: c }]} />
              <Text style={styles.legendText}>{l}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Inquiry / appointment detail */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setDetail(null)} />
        {detail ? (
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={[styles.kindTag, { backgroundColor: entryColor(detail) + '22', alignSelf: 'flex-start', marginBottom: 6 }]}>
              <Text style={[styles.kindTagText, { color: entryColor(detail) }]}>{kindLabel(detail)}</Text>
            </View>
            <Text style={styles.sheetTitle}>{detail.name}</Text>
            {detail.clientName && detail.kind === 'inquiry' ? <Text style={styles.sheetSub}>Client: {detail.clientName}</Text> : null}
            <View style={styles.sheetRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.sheetValue}>{formatDate(detail.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            {detail.startTime ? (
              <View style={styles.sheetRow}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.sheetValue}>
                  {formatTime(detail.startTime)}{detail.durationMinutes ? ` (${detail.durationMinutes} min)` : ''}
                </Text>
              </View>
            ) : null}
            {detail.clientEmail ? (
              <View style={styles.sheetRow}><Ionicons name="mail-outline" size={16} color={Colors.primary} /><Text style={styles.sheetValue}>{detail.clientEmail}</Text></View>
            ) : null}
            {detail.clientPhone ? (
              <View style={styles.sheetRow}><Ionicons name="call-outline" size={16} color={Colors.primary} /><Text style={styles.sheetValue}>{detail.clientPhone}</Text></View>
            ) : null}
            {detail.notes ? (
              <View style={styles.sheetRow}><Ionicons name="document-text-outline" size={16} color={Colors.primary} /><Text style={styles.sheetValue}>{detail.notes}</Text></View>
            ) : null}
            <View style={styles.sheetActions}>
              {detail.kind === 'inquiry' ? (
                <AppButton title="View Clients" onPress={() => { setDetail(null); router.push('/(tabs)/clients' as any); }} style={{ flex: 1 }} />
              ) : (
                <AppButton title={deleting ? 'Deleting…' : 'Delete'} variant="outline" disabled={deleting} onPress={() => deleteAppointment(detail)}
                  style={{ flex: 1, borderColor: Colors.error }} textStyle={{ color: Colors.error }} />
              )}
              <AppButton title="Close" variant="outline" onPress={() => setDetail(null)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Schedule appointment */}
      <Modal visible={apptOpen} transparent animationType="slide" onRequestClose={() => setApptOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setApptOpen(false)} />
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Schedule Appointment</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <EvtField label="Client Name" required value={apptName} onChangeText={setApptName} error={apptErrors.name} autoCapitalize="words" />
              <EvtField label="Email" value={apptEmail} onChangeText={setApptEmail} keyboardType="email-address" autoCapitalize="none" />
              <EvtField label="Phone" value={apptPhone} onChangeText={setApptPhone} keyboardType="phone-pad" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.4 }}>
                  <DateTimeField mode="date" label="Date" required value={apptDate} onChange={setApptDate} error={apptErrors.date} />
                </View>
                <View style={{ flex: 1 }}>
                  <DateTimeField mode="time" label="Time" required value={apptTime} onChange={setApptTime} error={apptErrors.time} />
                </View>
              </View>
              <EvtField label="Duration (minutes)" value={apptDuration} onChangeText={setApptDuration} keyboardType="number-pad" />
              <EvtField label="Notes" value={apptNotes} onChangeText={setApptNotes} multiline />
            </ScrollView>
            <View style={styles.sheetActions}>
              <AppButton title="Cancel" variant="outline" onPress={() => setApptOpen(false)} style={{ flex: 1 }} />
              <AppButton title="Schedule" onPress={saveAppt} loading={apptSaving} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 32 },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  segment: { flexDirection: 'row', backgroundColor: Colors.borderLight, borderRadius: Radius.md, padding: 2 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  segBtnActive: { backgroundColor: Colors.primary },
  segText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segTextActive: { color: Colors.textWhite },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  todayText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: Radius.md, backgroundColor: TEAL,
  },
  addBtnText: { color: Colors.textWhite, fontSize: 12, fontWeight: '700' },

  venueScroll: { flexGrow: 0, backgroundColor: Colors.surface },
  venueRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.borderLight, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  monthTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  chevron: { padding: 6 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningLight, paddingHorizontal: 16, paddingVertical: 6 },
  warningText: { fontSize: 12, color: Colors.warningText, flex: 1 },

  dowRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8, paddingTop: 6,
  },
  dowText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface },
  cell: {
    width: `${100 / 7}%`, height: CELL_SIZE, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: Colors.border,
  },
  cellSelected: { backgroundColor: Colors.primaryLight },
  dayCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  todayCircle: { backgroundColor: Colors.primary },
  selectedCircle: { backgroundColor: Colors.primaryDark },
  dayNum: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  dayNumOn: { color: Colors.textWhite, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  more: { fontSize: 9, color: Colors.textMuted, fontWeight: '700' },

  list: { padding: 16 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  clear: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  emptyText: { fontSize: 13, color: Colors.textMuted, paddingVertical: 6 },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, marginBottom: 8, padding: 12, ...Shadow.sm, overflow: 'hidden',
  },
  colorBar: { width: 3, position: 'absolute', left: 0, top: 0, bottom: 0 },
  dateBox: { width: 38, alignItems: 'center', marginLeft: 8, marginRight: 10 },
  dateDay: { fontSize: 18, fontWeight: '700' },
  dateMon: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1 },
  entryMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  kindTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full },
  kindTagText: { fontSize: 10, fontWeight: '700' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: Colors.textSecondary },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  sheetSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  sheetValue: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
