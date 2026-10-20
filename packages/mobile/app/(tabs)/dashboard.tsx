import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Share, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import {
  IntakeForm, CrmInvoice, CrmBooking, num, money, formatDate, titleCase, formatEventType,
  leadStatus, leadTone, CLIENT_STATUS_LABELS, CLIENT_STATUS_TONES, bookingClientStatus,
  bookingClientName, bookingEventName, bookingDate, bookingMoney, parseLocalDate, errorMessage,
} from '@/components/CrmShared';

interface OwnerVenue { id: string | number; name?: string }

const INTAKE_BASE_URL = 'https://eventecos.com/intake';

export default function DashboardScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('owner');
  const [invoices, setInvoices] = useState<CrmInvoice[]>([]);
  const [bookings, setBookings] = useState<CrmBooking[]>([]);
  const [clients, setClients] = useState<IntakeForm[]>([]);
  const [venues, setVenues] = useState<OwnerVenue[]>([]);
  const [intakeSlug, setIntakeSlug] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You are signed out. Please sign in again.');
      setUserId(user.id);
      setUserName((n) => n || user.email?.split('@')[0] || 'there');

      const [invRes, bookRes, clientRes, venueRes, slugRes, profileRes] = await Promise.allSettled([
        apiRequest<CrmInvoice[]>('/invoices'),
        apiRequest<CrmBooking[]>('/bookings'),
        apiRequest<IntakeForm[]>('/intake-forms'),
        apiRequest<{ venues?: OwnerVenue[] }>('/owner/venues'),
        apiRequest<{ intakeSlug?: string }>(`/intake-forms/public-form/${user.id}`),
        supabase.from('users').select('role, first_name').eq('id', user.id).maybeSingle(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data as { role?: string; first_name?: string };
        if (p.role) setUserRole(p.role);
        if (p.first_name) setUserName(p.first_name);
      }

      const core = [invRes, bookRes, clientRes];
      const failed = core.filter((r) => r.status === 'rejected');
      if (failed.length === core.length) {
        throw (failed[0] as PromiseRejectedResult).reason;
      }
      setPartial(failed.length > 0);

      if (invRes.status === 'fulfilled') setInvoices(Array.isArray(invRes.value) ? invRes.value : []);
      if (bookRes.status === 'fulfilled') setBookings(Array.isArray(bookRes.value) ? bookRes.value : []);
      if (clientRes.status === 'fulfilled') setClients(Array.isArray(clientRes.value) ? clientRes.value : []);
      if (venueRes.status === 'fulfilled') setVenues(venueRes.value?.venues ?? []);
      if (slugRes.status === 'fulfilled' && slugRes.value?.intakeSlug) setIntakeSlug(slugRes.value.intakeSlug);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load dashboard.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Same calculations as the web dashboard.
  const stats = useMemo(() => {
    const unpaid = invoices.filter(
      (i) => i.status !== 'paid' && i.status !== 'cancelled' && num(i.amount_due ?? i.amountDue) > 0,
    );
    return {
      unpaidInvoices: unpaid.length,
      unpaidAmount: unpaid.reduce((s, i) => s + num(i.amount_due ?? i.amountDue), 0),
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => (b.client_status ?? b.clientStatus) === 'completed').length,
      totalRevenue: invoices.reduce((s, i) => s + num(i.amount_paid ?? i.amountPaid), 0),
      pendingPayments: invoices
        .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
        .reduce((s, i) => s + num(i.amount_due ?? i.amountDue), 0),
      totalClients: clients.length,
      newClients: clients.filter((c) => c.status === 'new').length,
    };
  }, [invoices, bookings, clients]);

  const recentClients = useMemo(
    () => [...clients]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 5),
    [clients],
  );

  const upcoming = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 8 * 24 * 60 * 60 * 1000);
    const when = (b: CrmBooking) =>
      parseLocalDate(bookingDate(b) ?? b.created_at ?? b.createdAt)?.getTime() ?? 0;
    return bookings
      .filter((b) => bookingClientStatus(b) !== 'cancelled' && when(b) >= start.getTime() && when(b) < end.getTime())
      .sort((a, b) => when(a) - when(b))
      .slice(0, 5);
  }, [bookings]);

  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings]);

  const shareIntake = async (venue?: OwnerVenue) => {
    const owner = intakeSlug ?? userId;
    if (!owner) return;
    const query = venue && venues.length > 1 ? `?venueId=${venue.id}` : '';
    const link = `${INTAKE_BASE_URL}/${owner}${query}`;
    try {
      await Share.share({ message: `Share your event details with us: ${link}`, url: link });
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Could not open the share sheet.'));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loading) return <LoadingState message="Loading dashboard..." />;

  if (error) {
    return (
      <View style={styles.errorWrap}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load dashboard" message={error} />
        <AppButton title="Retry" onPress={() => { setLoading(true); loadData(); }} style={{ marginHorizontal: 32 }} />
      </View>
    );
  }

  const statCards = [
    { icon: 'alert-circle-outline', label: 'Unpaid Invoices', value: String(stats.unpaidInvoices), sub: `${money(stats.unpaidAmount)} outstanding`, color: Colors.error, bg: Colors.errorLight, route: '/(tabs)/invoices' },
    { icon: 'checkmark-circle-outline', label: 'Total Bookings', value: String(stats.totalBookings), sub: `${stats.completedBookings} completed`, color: Colors.success, bg: Colors.successLight, route: '/(tabs)/bookings' },
    { icon: 'person-add-outline', label: 'New Leads', value: String(stats.totalClients), sub: `${stats.newClients} new leads`, color: Colors.purple, bg: Colors.purpleLight, route: '/(tabs)/clients' },
    { icon: 'cash-outline', label: 'Total Revenue', value: money(stats.totalRevenue), sub: 'Collected', color: Colors.primary, bg: Colors.primaryLight, route: '/(tabs)/invoices' },
  ];

  const shareTargets: (OwnerVenue | undefined)[] = venues.length > 1 ? venues : [undefined];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back, {userName} 👋</Text>
          <Text style={styles.roleLabel}>{titleCase(userRole)} Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Sign out">
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {partial && (
        <Text style={styles.partialNote}>Some data couldn't be loaded. Pull down to refresh.</Text>
      )}

      <View style={styles.grid}>
        {statCards.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.statCard, Shadow.sm]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text style={[styles.statNumber, { color: item.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statSub}>{item.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {stats.pendingPayments > 0 && (
        <View style={[styles.pendingCard, Shadow.sm]}>
          <Ionicons name="time-outline" size={18} color={Colors.warning} />
          <Text style={styles.pendingText}>{money(stats.pendingPayments)} pending collection</Text>
        </View>
      )}

      <SectionHeader title="Upcoming This Week" action={{ label: 'View All', onPress: () => router.push('/(tabs)/bookings' as any) }} />
      <View style={styles.listCard}>
        {upcoming.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming bookings in the next 7 days</Text>
        ) : upcoming.map((b) => {
          const status = bookingClientStatus(b);
          const tone = CLIENT_STATUS_TONES[status] ?? CLIENT_STATUS_TONES.contacted_by_phone;
          const { total, due } = bookingMoney(b, invoices);
          return (
            <TouchableOpacity
              key={b.id}
              style={styles.row}
              onPress={() => router.push(`/(tabs)/events/${b.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{bookingEventName(b)}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>Client: {bookingClientName(b)}</Text>
                <Text style={styles.rowSub}>
                  {formatDate(bookingDate(b))} · {b.guest_count ?? 0} guests · {money(total)}
                  {due > 0 ? ` · ${money(due)} due` : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>{CLIENT_STATUS_LABELS[status] ?? titleCase(status)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.shareCard, Shadow.sm]}>
        <Text style={styles.shareTitle}>Share Your Client Intake Form</Text>
        <Text style={styles.shareSub}>Send this link to clients to collect event details automatically.</Text>
        {shareTargets.map((venue) => (
          <TouchableOpacity
            key={venue ? String(venue.id) : 'default'}
            style={styles.shareBtn}
            onPress={() => shareIntake(venue)}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={18} color={Colors.primary} />
            <Text style={styles.shareBtnText} numberOfLines={1}>
              {venue?.name ? `Share link — ${venue.name}` : 'Share intake form link'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="Recent Client Inquiries" action={{ label: 'View All', onPress: () => router.push('/(tabs)/clients' as any) }} />
      <View style={styles.listCard}>
        {recentClients.length === 0 ? (
          <Text style={styles.emptyText}>No client inquiries yet</Text>
        ) : recentClients.map((c) => {
          const status = leadStatus(c);
          const tone = leadTone(status);
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              onPress={() => router.push('/(tabs)/clients' as any)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{c.contact_name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {c.event_name || formatEventType(c.event_type)} · {formatDate(c.event_date)} · {c.guest_count ?? 0} guests
                </Text>
                {!!c.contact_email && <Text style={styles.rowSub} numberOfLines={1}>{c.contact_email}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>{titleCase(status)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionHeader title="Recent Bookings" action={{ label: 'View All', onPress: () => router.push('/(tabs)/bookings' as any) }} />
      <View style={styles.listCard}>
        {recentBookings.length === 0 ? (
          <Text style={styles.emptyText}>No bookings yet</Text>
        ) : recentBookings.map((b) => {
          const status = bookingClientStatus(b);
          const tone = CLIENT_STATUS_TONES[status] ?? CLIENT_STATUS_TONES.contacted_by_phone;
          const { total, paid } = bookingMoney(b, invoices);
          return (
            <TouchableOpacity
              key={b.id}
              style={styles.row}
              onPress={() => router.push(`/(tabs)/events/${b.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{bookingClientName(b)}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{bookingEventName(b)}</Text>
                <Text style={styles.rowSub}>{money(total)} total · {money(paid)} paid</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>{CLIENT_STATUS_LABELS[status] ?? titleCase(status)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.navList}>
        {[
          { icon: 'calendar', color: Colors.primary, bg: Colors.primaryLight, label: 'Events', route: '/(tabs)/events' },
          { icon: 'calendar-outline', color: Colors.primary, bg: Colors.primaryLight, label: 'Calendar', route: '/(tabs)/calendar' },
          { icon: 'link-outline', color: Colors.purple, bg: Colors.purpleLight, label: 'Booking Link', route: '/(tabs)/booking-link' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.navButton, Shadow.sm]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.navIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.navButtonLabel} numberOfLines={1}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.switchBtn} onPress={() => router.push('/(guest)')}>
        <Ionicons name="earth-outline" size={16} color={Colors.primary} />
        <Text style={styles.switchText}>Browse EventEcos as Guest</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  errorWrap: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  roleLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  logoutBtn: { padding: 8 },
  partialNote: {
    marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: Radius.lg,
    backgroundColor: Colors.warningLight, color: Colors.warningText, fontSize: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 16, width: '47%', gap: 4,
  },
  statIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  statSub: { fontSize: 11, color: Colors.textMuted },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16,
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 14,
  },
  pendingText: { fontSize: 13, color: Colors.warningText, fontWeight: '600' },
  listCard: {
    backgroundColor: Colors.surface, marginHorizontal: 16, borderRadius: Radius.xl,
    marginBottom: 20, overflow: 'hidden', ...Shadow.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyText: { padding: 24, textAlign: 'center', fontSize: 13, color: Colors.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  shareCard: {
    backgroundColor: Colors.primary, marginHorizontal: 16, borderRadius: Radius.xl,
    padding: 16, marginBottom: 20, gap: 8,
  },
  shareTitle: { fontSize: 16, fontWeight: '700', color: Colors.textWhite },
  shareSub: { fontSize: 13, color: Colors.primaryLight },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: 12,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary, flexShrink: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  navList: { paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  navButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  navIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  navButtonLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  switchText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
