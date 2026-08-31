import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface PromoterEvent {
  id: string;
  title: string;
  event_date: string;
  status: 'draft' | 'published' | 'cancelled';
}

interface ArtistBooking {
  id: string;
  event_name: string;
  event_date?: string | null;
  status: string;
  artist_accounts?: { artist_name?: string; stage_name?: string } | null;
}

interface VendorBooking {
  id: string;
  event_name?: string;
  event_date?: string;
  status: string;
  vendor_accounts?: { business_name?: string; category?: string } | null;
}

type CalItem =
  | ({ _source: 'event' } & PromoterEvent)
  | ({ _source: 'artist' } & ArtistBooking)
  | ({ _source: 'vendor' } & VendorBooking);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SOURCE_COLORS: Record<CalItem['_source'], string> = {
  event: Colors.purple,
  artist: '#10B981',
  vendor: '#F59E0B',
};

const SOURCE_LABELS: Record<CalItem['_source'], string> = {
  event: 'My Event',
  artist: 'Artist Booking',
  vendor: 'Vendor Booking',
};

const itemLabel = (item: CalItem) => {
  if (item._source === 'event') return item.title || 'Untitled Event';
  if (item._source === 'artist') return item.event_name || 'Artist Booking';
  return item.event_name || 'Vendor Booking';
};

const itemSubLabel = (item: CalItem) => {
  if (item._source === 'event') return SOURCE_LABELS.event;
  if (item._source === 'artist') {
    const name = item.artist_accounts?.stage_name || item.artist_accounts?.artist_name;
    return name ? `Artist · ${name}` : 'Artist Booking';
  }
  const name = item.vendor_accounts?.business_name;
  return name ? `Vendor · ${name}` : 'Vendor Booking';
};

const getDate = (item: CalItem): string | null =>
  item._source === 'event' ? item.event_date : item.event_date ?? null;

const parseLocal = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function PromoterCalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [items, setItems] = useState<CalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [eventsResult, artistResult, vendorResult] = await Promise.allSettled([
        apiRequest<PromoterEvent[]>('/promoter-events/mine'),
        apiRequest<ArtistBooking[]>('/promoter-bookings/mine'),
        apiRequest<VendorBooking[]>('/vendors/bookings/booked-by-me'),
      ]);

      const events: CalItem[] = eventsResult.status === 'fulfilled'
        ? eventsResult.value.map(e => ({ _source: 'event' as const, ...e }))
        : [];
      const artistBookings: CalItem[] = artistResult.status === 'fulfilled'
        ? artistResult.value.map(b => ({ _source: 'artist' as const, ...b }))
        : [];
      const vendorBookings: CalItem[] = vendorResult.status === 'fulfilled'
        ? vendorResult.value.map(b => ({ _source: 'vendor' as const, ...b }))
        : [];

      if (
        eventsResult.status === 'rejected' &&
        artistResult.status === 'rejected' &&
        vendorResult.status === 'rejected'
      ) {
        setError('Failed to load calendar.');
      }

      setItems([...events, ...artistBookings, ...vendorBookings]);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar.');
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

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const itemsWithDates = items.filter(i => !!getDate(i));

  const itemsForDay = (day: number) =>
    itemsWithDates.filter(i => {
      const d = parseLocal(getDate(i) as string);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const monthItems = itemsWithDates
    .filter(i => {
      const d = parseLocal(getDate(i) as string);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => (getDate(a) as string).localeCompare(getDate(b) as string));

  const selectedItems = selectedDay ? itemsForDay(selectedDay) : [];

  const goToDetail = (item: CalItem) => {
    setModalVisible(false);
    if (item._source === 'event') router.push(`/(promoter)/events/${item.id}` as any);
    else if (item._source === 'artist') router.push(`/(promoter)/bookings/${item.id}` as any);
    else router.push(`/(promoter)/vendor-bookings/${item.id}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.chevron}>
          <Ionicons name="chevron-back" size={22} color={Colors.purple} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.chevron}>
          <Ionicons name="chevron-forward" size={22} color={Colors.purple} />
        </TouchableOpacity>
      </View>

      <View style={styles.dowRow}>
        {DAYS.map(d => (
          <Text key={d} style={styles.dowText}>{d}</Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.purple} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.gridScroll}>
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selectedDay;
              const dayItems = day ? itemsForDay(day) : [];
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => {
                    if (!day) return;
                    setSelectedDay(day);
                    if (itemsForDay(day).length > 0) setModalVisible(true);
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
                        {dayItems.slice(0, 3).map((it, i) => (
                          <View key={i} style={[styles.dot, { backgroundColor: SOURCE_COLORS[it._source] }]} />
                        ))}
                      </View>
                    </>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.eventList}>
            <Text style={styles.eventListTitle}>
              {monthItems.length > 0
                ? `${monthItems.length} item${monthItems.length === 1 ? '' : 's'} this month`
                : 'Nothing scheduled this month'}
            </Text>
            {monthItems.length === 0 && items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Nothing on your calendar yet</Text>
              </View>
            ) : (
              monthItems.map(item => {
                const d = parseLocal(getDate(item) as string);
                const color = SOURCE_COLORS[item._source];
                return (
                  <TouchableOpacity
                    key={`${item._source}-${item.id}`}
                    style={styles.eventRow}
                    onPress={() => goToDetail(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.eventColorBar, { backgroundColor: color }]} />
                    <View style={styles.eventDateBox}>
                      <Text style={[styles.eventDay, { color }]}>{d.getDate()}</Text>
                      <Text style={styles.eventMon}>{MONTHS[d.getMonth()].slice(0, 3)}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName} numberOfLines={1}>{itemLabel(item)}</Text>
                      <Text style={styles.eventMeta} numberOfLines={1}>{itemSubLabel(item)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

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
            data={selectedItems}
            keyExtractor={item => `${item._source}-${item.id}`}
            renderItem={({ item }) => {
              const color = SOURCE_COLORS[item._source];
              return (
                <TouchableOpacity style={styles.sheetRow} onPress={() => goToDetail(item)}>
                  <View style={[styles.sheetDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetEventName}>{itemLabel(item)}</Text>
                    <Text style={styles.sheetEventMeta}>{itemSubLabel(item)}</Text>
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
  cellSelected: { backgroundColor: Colors.purpleLight },
  dayCircle: {
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  todayCircle: { backgroundColor: Colors.purple },
  selectedCircle: { backgroundColor: Colors.purple },
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
  retryBtn: { backgroundColor: Colors.purple, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 10 },
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
