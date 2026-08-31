import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface OwnBooking {
  id: string;
  event_name: string;
  client_name: string;
  event_date: string | null;
  status: string;
  agreed_amount: number | null;
}

interface PromoterGigBooking {
  id: string;
  event_name: string;
  event_date: string | null;
  status: string;
  agreed_amount: number | null;
  promoter_accounts?: { company_name: string | null; contact_name: string | null } | null;
}

type CalBooking =
  | ({ _source: 'own' } & OwnBooking)
  | ({ _source: 'promoter' } & PromoterGigBooking);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS: Record<string, string> = {
  inquiry: '#9CA3AF',
  estimate_sent: '#60A5FA',
  deposit_paid: '#FBBF24',
  confirmed: '#10B981',
  completed: '#A78BFA',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const bookingLabel = (b: CalBooking) =>
  b.event_name || (b._source === 'promoter' ? 'Promoter Gig' : 'Untitled Event');

const bookingSubLabel = (b: CalBooking) =>
  b._source === 'own'
    ? b.client_name
    : b.promoter_accounts?.company_name || b.promoter_accounts?.contact_name || 'Promoter';

const parseLocal = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function ArtistCalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [bookings, setBookings] = useState<CalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ownResult, promoterResult] = await Promise.allSettled([
        apiRequest<OwnBooking[]>('/artist-bookings/mine'),
        apiRequest<PromoterGigBooking[]>('/promoter-bookings/for-artist'),
      ]);

      const own: CalBooking[] = ownResult.status === 'fulfilled'
        ? ownResult.value.map(b => ({ _source: 'own' as const, ...b }))
        : [];
      const promoter: CalBooking[] = promoterResult.status === 'fulfilled'
        ? promoterResult.value.map(b => ({ _source: 'promoter' as const, ...b }))
        : [];

      if (ownResult.status === 'rejected' && promoterResult.status === 'rejected') {
        setError('Failed to load bookings.');
      }

      setBookings([...own, ...promoter]);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
  while (cells.length % 7 !== 0) cells.push(null);

  const bookingsWithDates = bookings.filter(b => !!b.event_date);

  const bookingsForDay = (day: number) =>
    bookingsWithDates.filter(b => {
      const d = parseLocal(b.event_date as string);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const monthBookings = bookingsWithDates
    .filter(b => {
      const d = parseLocal(b.event_date as string);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => (a.event_date as string).localeCompare(b.event_date as string));

  const selectedBookings = selectedDay ? bookingsForDay(selectedDay) : [];

  const goToDetail = (b: CalBooking) => {
    setModalVisible(false);
    router.push(`/(artist)/bookings/${b.id}?source=${b._source}` as any);
  };

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
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); load(); }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.gridScroll}>
          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selectedDay;
              const dayBookings = day ? bookingsForDay(day) : [];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => {
                    if (!day) return;
                    setSelectedDay(day);
                    if (bookingsForDay(day).length > 0) setModalVisible(true);
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
                        {dayBookings.slice(0, 3).map((b, i) => (
                          <View
                            key={i}
                            style={[styles.dot, { backgroundColor: STATUS_COLORS[b.status] || Colors.primary }]}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month booking list */}
          <View style={styles.eventList}>
            <Text style={styles.eventListTitle}>
              {monthBookings.length > 0
                ? `${monthBookings.length} booking${monthBookings.length === 1 ? '' : 's'} this month`
                : 'No bookings this month'}
            </Text>
            {monthBookings.length === 0 && bookings.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No bookings yet</Text>
              </View>
            ) : (
              monthBookings.map(b => {
                const d = parseLocal(b.event_date as string);
                const color = STATUS_COLORS[b.status] || Colors.primary;
                return (
                  <TouchableOpacity
                    key={`${b._source}-${b.id}`}
                    style={styles.eventRow}
                    onPress={() => goToDetail(b)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.eventColorBar, { backgroundColor: color }]} />
                    <View style={styles.eventDateBox}>
                      <Text style={[styles.eventDay, { color }]}>{d.getDate()}</Text>
                      <Text style={styles.eventMon}>{MONTHS[d.getMonth()].slice(0, 3)}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName} numberOfLines={1}>{bookingLabel(b)}</Text>
                      <Text style={styles.eventMeta} numberOfLines={1}>
                        {bookingSubLabel(b)} · {STATUS_LABELS[b.status] || b.status}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Day bookings modal */}
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
            data={selectedBookings}
            keyExtractor={b => `${b._source}-${b.id}`}
            renderItem={({ item }) => {
              const color = STATUS_COLORS[item.status] || Colors.primary;
              return (
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => goToDetail(item)}
                >
                  <View style={[styles.sheetDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetEventName}>{bookingLabel(item)}</Text>
                    <Text style={styles.sheetEventMeta}>{bookingSubLabel(item)}</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 12 },
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

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },

  errorText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

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
