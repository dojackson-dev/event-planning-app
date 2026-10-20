import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import { fmtMoney, num, toList } from '@/components/netFormat';

interface Booking { id: string; status: string; event_date: string; agreed_amount?: number | null }
interface Invoice {
  id: string; status: string; total_amount?: number; amount_paid?: number;
  amount_due?: number; paid_at?: string | null; created_at?: string;
}

// Read-only earnings summary, same math as the web vendors/dashboard/earnings page.
export default function VendorEarningsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [b, i] = await Promise.allSettled([
        apiRequest<any>('/vendors/bookings/mine'),
        apiRequest<any>('/vendor-invoices/mine'),
      ]);
      if (b.status === 'rejected') throw b.reason;
      setBookings(toList<Booking>(b.value, 'bookings'));
      setInvoices(i.status === 'fulfilled' ? toList<Invoice>(i.value, 'invoices') : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load earnings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState message="Loading earnings..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load earnings" message={error} />
        <View style={styles.retry}><AppButton title="Try Again" variant="outline" onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  const paidBookings = bookings.filter((b) => b.status === 'paid' || b.status === 'completed');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const openInvoices = invoices.filter((i) => ['sent', 'viewed', 'partial', 'overdue'].includes(i.status));

  const totalEarned =
    paidBookings.reduce((s, b) => s + num(b.agreed_amount), 0) +
    paidInvoices.reduce((s, i) => s + num(i.amount_paid || i.total_amount), 0);
  const totalPending =
    confirmed.reduce((s, b) => s + num(b.agreed_amount), 0) +
    openInvoices.reduce((s, i) => s + num(i.amount_due || i.total_amount), 0);
  const txCount = paidBookings.length + paidInvoices.length;

  const byMonth: Record<string, { sort: string; amount: number }> = {};
  const add = (iso: string | undefined | null, amount: number) => {
    if (!iso) return;
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const sort = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = { sort, amount: (byMonth[key]?.amount || 0) + amount };
  };
  paidBookings.forEach((b) => add(b.event_date, num(b.agreed_amount)));
  paidInvoices.forEach((i) => add(i.paid_at || i.created_at, num(i.amount_paid || i.total_amount)));
  const months = Object.entries(byMonth).sort((a, b) => a[1].sort.localeCompare(b[1].sort));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <View style={styles.stats}>
        <View style={[styles.stat, Shadow.sm, { backgroundColor: Colors.successLight }]}>
          <Text style={styles.statLabel}>Total Earned</Text>
          <Text style={[styles.statValue, { color: Colors.successText }]}>{fmtMoney(totalEarned, 0)}</Text>
          <Text style={styles.statSub}>{paidBookings.length} booking{paidBookings.length === 1 ? '' : 's'} + {paidInvoices.length} invoice{paidInvoices.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={[styles.stat, Shadow.sm, { backgroundColor: Colors.infoLight }]}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: Colors.infoText }]}>{fmtMoney(totalPending, 0)}</Text>
          <Text style={styles.statSub}>{confirmed.length} upcoming · {openInvoices.length} open invoice{openInvoices.length === 1 ? '' : 's'}</Text>
        </View>
      </View>
      <View style={[styles.avg, Shadow.sm]}>
        <Text style={styles.statLabel}>Average per transaction</Text>
        <Text style={styles.avgValue}>{txCount > 0 ? fmtMoney(totalEarned / txCount, 0) : '$0'}</Text>
      </View>

      <SectionHeader title="Monthly Breakdown" />
      {months.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="No earnings yet" message="Paid bookings and invoices will show up here." />
      ) : (
        <View style={[styles.card, Shadow.sm]}>
          {months.map(([label, { amount }]) => {
            const pct = totalEarned > 0 ? Math.max(4, Math.round((amount / totalEarned) * 100)) : 0;
            return (
              <View key={label} style={styles.monthRow}>
                <Text style={styles.monthLabel}>{label}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                <Text style={styles.monthAmount}>{fmtMoney(amount, 0)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  retry: { paddingHorizontal: 32, marginTop: -20 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stat: { flex: 1, borderRadius: Radius.lg, padding: 14 },
  statLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  statSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  avg: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  avgValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, gap: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthLabel: { width: 76, fontSize: 13, color: Colors.textSecondary },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.borderLight },
  barFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  monthAmount: { width: 72, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
});
