import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface CalEvent {
  id: string;
  name: string;
  date: string;
  status?: string;
  venue?: string;
  start_time?: string;
  intake_form?: { event_name?: string; event_type?: string } | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusColors: Record<string, string> = {
  scheduled: Colors.primary,
  confirmed: '#10B981',
  completed: '#9CA3AF',
  cancelled: '#EF4444',
  draft: '#9CA3AF',
};

const formatEventType = (type?: string) =>
  type ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const formatTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { loadEvents(); }, [year, month]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const { data } = await supabase
        .from('event')
        .select('id, name, date, status, venue, start_time, intake_form:intake_forms!intake_form_id(event_name, event_type)')
        .eq('owner_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date');
      setEvents((data as unknown as CalEvent[]) || []);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const displayName = (e: CalEvent) =>
    e.intake_form?.event_name || formatEventType(e.intake_form?.event_type) || e.name;

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.chevron}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.chevron}>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week row */}
      <View style={styles.dowRow}>
        {DAYS.map(d => (
          <Text key={d} style={styles.dowText}>{d}</Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.gridScroll}>
          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selectedDay;
              const dayEvents = day ? eventsForDay(day) : [];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={() => {
                    if (!day) return;
                    setSelectedDay(day);
                    if (eventsForDay(day).length > 0) setModalVisible(true);
                  }}
                  disabled={!day}
                  activeOpacity={0.7}
                >
                  {day ? (
                    <>
                      <View style={[styles.dayCircle, isToday && styles.todayCircle, isSelected && styles.selectedCircle]}>
                        <Text style={[styles.dayNum, isToday && styles.todayNum, isSelected && styles.selectedNum]}>
                          {day}
                        </Text>
                      </View>
                      <View style={styles.dotRow}>
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <View
                            key={i}
                            style={[styles.dot, { backgroundColor: statusColors[e.status || ''] || Colors.primary }]}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month event list */}
          <View style={styles.eventList}>
            <Text style={styles.eventListTitle}>
              {events.length > 0 ? `${events.length} event${events.length === 1 ? '' : 's'} this month` : 'No events this month'}
            </Text>
            {events.map(e => {
              const d = new Date(e.date + 'T00:00:00');
              const color = statusColors[e.status || ''] || Colors.primary;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={styles.eventRow}
                  onPress={() => router.push(`/(tabs)/events/${e.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.eventColorBar, { backgroundColor: color }]} />
                  <View style={styles.eventDateBox}>
                    <Text style={[styles.eventDay, { color }]}>{d.getDate()}</Text>
                    <Text style={styles.eventMon}>{MONTHS[d.getMonth()].slice(0, 3)}</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName} numberOfLines={1}>{displayName(e)}</Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {e.start_time ? formatTime(e.start_time) : ''}
                      {e.venue ? `  ·  ${e.venue}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Day events modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {MONTHS[month]} {selectedDay}, {year}
          </Text>
          <FlatList
            data={selectedEvents}
            keyExtractor={e => e.id}
            renderItem={({ item }) => {
              const color = statusColors[item.status || ''] || Colors.primary;
              return (
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => {
                    setModalVisible(false);
                    router.push(`/(tabs)/events/${item.id}` as any);
                  }}
                >
                  <View style={[styles.sheetDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetEventName}>{displayName(item)}</Text>
                    {item.start_time && (
                      <Text style={styles.sheetEventMeta}>{formatTime(item.start_time)}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  monthTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  chevron: { padding: 6 },
  dowRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingBottom: 8, paddingTop: 4,
  },
  dowText: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: Colors.textMuted, textTransform: 'uppercase',
  },
  gridScroll: { paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface },
  cell: {
    width: `${100 / 7}%`, height: CELL_SIZE, alignItems: 'center',
    justifyContent: 'flex-start', paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: Colors.border,
  },
  cellSelected: { backgroundColor: Colors.primaryLight },
  dayCircle: {
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  todayCircle: { backgroundColor: Colors.primary },
  selectedCircle: { backgroundColor: Colors.primaryDark },
  dayNum: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  todayNum: { color: '#FFFFFF', fontWeight: '700' },
  selectedNum: { color: '#FFFFFF', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  eventList: { padding: 16 },
  eventListTitle: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, marginBottom: 8, padding: 12, ...Shadow.sm,
    overflow: 'hidden',
  },
  eventColorBar: { width: 3, height: '100%', borderRadius: 2, marginRight: 10, position: 'absolute', left: 0, top: 0, bottom: 0 },
  eventDateBox: { width: 38, alignItems: 'center', marginLeft: 8, marginRight: 10 },
  eventDay: { fontSize: 18, fontWeight: '700' },
  eventMon: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  eventMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '60%',
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  sheetDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  sheetEventName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  sheetEventMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
