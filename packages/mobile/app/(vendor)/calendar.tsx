import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import { fmtDate, fmtMoney, fmtTime, toList } from '@/components/netFormat';

interface VendorBooking {
  id: string;
  event_name?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  status: string;
  agreed_amount?: number | null;
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending: { bg: Colors.warningLight, fg: Colors.warningText },
  confirmed: { bg: Colors.successLight, fg: Colors.successText },
  completed: { bg: Colors.infoLight, fg: Colors.infoText },
  paid: { bg: Colors.purpleLight, fg: Colors.purpleText },
};

// Vendors' calendar: agenda of upcoming pending/confirmed dates grouped by month.
export default function VendorCalendarScreen() {
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiRequest<any>('/vendors/bookings/mine');
      setBookings(toList<VendorBooking>(data, 'bookings'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load calendar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState message="Loading calendar..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load calendar" message={error} />
        <View style={styles.retry}><AppButton title="Try Again" variant="outline" onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => ['pending', 'confirmed'].includes(b.status) && (b.event_date || '') >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const groups: Record<string, VendorBooking[]> = {};
  upcoming.forEach((b) => {
    const label = new Date(`${b.event_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    (groups[label] = groups[label] || []).push(b);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      {upcoming.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Nothing on the calendar" message="Upcoming pending and confirmed bookings will appear here." />
      ) : (
        Object.entries(groups).map(([month, items]) => (
          <View key={month}>
            <SectionHeader title={month} subtitle={`${items.length} booking${items.length === 1 ? '' : 's'}`} />
            {items.map((b) => {
              const st = STATUS_COLOR[b.status] || STATUS_COLOR.pending;
              const date = new Date(`${b.event_date}T00:00:00`);
              const time = [fmtTime(b.start_time), fmtTime(b.end_time)].filter(Boolean).join(' – ');
              return (
                <View key={b.id} style={[styles.card, Shadow.sm]}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{date.getDate()}</Text>
                    <Text style={styles.dateMon}>{date.toLocaleDateString('en-US', { month: 'short' })}</Text>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={1}>{b.event_name || 'Booking'}</Text>
                    <Text style={styles.sub}>{fmtDate(b.event_date)}{time ? ` · ${time}` : ''}</Text>
                    {!!b.venue_name && (
                      <View style={styles.row}>
                        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.sub} numberOfLines={1}>{b.venue_name}</Text>
                      </View>
                    )}
                    {b.agreed_amount != null && <Text style={styles.amount}>{fmtMoney(b.agreed_amount)}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.fg }]}>{b.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  retry: { paddingHorizontal: 32, marginTop: -20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 12, marginBottom: 10,
  },
  dateBox: {
    width: 52, height: 56, borderRadius: Radius.md, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 20, fontWeight: '800', color: Colors.primaryText },
  dateMon: { fontSize: 11, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase' },
  body: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textSecondary },
  amount: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
