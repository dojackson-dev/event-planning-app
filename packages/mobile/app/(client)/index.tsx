import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { clientApi, ClientAuthError, clientSignOut, getClientSession, ClientSession } from '@/lib/clientApi';
import { toList, num, fmtMoney } from '@/components/netFormat';
import { formatDate, formatTimeRange, todayKey } from '@/components/EvtDate';
import { pick, resolveEventStatus, statusLabel, statusColors } from '@/components/CliShared';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import SectionHeader from '@/components/SectionHeader';
import NetNavRow from '@/components/NetNavRow';
import CliErrorState from '@/components/CliErrorState';

type Overview = { contracts: any[]; estimates: any[]; invoices: any[] };

const dateKey = (v: unknown) => String(v ?? '').slice(0, 10);

function StatCard({ icon, label, value, tint, bg, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number; tint: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.stat, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const goLogin = useCallback(() => router.replace('/(auth)/client-login' as never), [router]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      getClientSession().then(setSession);
      const [overviewRes, eventsRes, confRes, notifRes] = await Promise.allSettled([
        clientApi('/overview'),
        clientApi('/events'),
        clientApi('/confirmations'),
        clientApi('/notifications'),
      ]);
      const all = [overviewRes, eventsRes, confRes, notifRes];
      if (all.some((r) => r.status === 'rejected' && r.reason instanceof ClientAuthError)) {
        goLogin();
        return;
      }
      if (overviewRes.status === 'rejected' || eventsRes.status === 'rejected') {
        const reason: any = overviewRes.status === 'rejected' ? overviewRes.reason : (eventsRes as PromiseRejectedResult).reason;
        setError(reason?.message || 'Failed to load your portal.');
        return;
      }
      const o: any = overviewRes.value ?? {};
      setOverview({
        contracts: toList(o.contracts),
        estimates: toList(o.estimates),
        invoices: toList(o.invoices),
      });
      setEvents(toList(eventsRes.value));
      setConfirmations(confRes.status === 'fulfilled' ? toList(confRes.value) : []);
      setUnread(notifRes.status === 'fulfilled' ? toList<any>(notifRes.value).filter((n) => !n.read).length : 0);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your portal.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [goLogin]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = async (id: string, action: 'confirmed' | 'rejected') => {
    setRespondingId(id);
    try {
      await clientApi(`/confirmations/${encodeURIComponent(id)}`, { method: 'POST', body: { action } });
      setConfirmations((prev) => prev.filter((c) => String(c.id) !== String(id)));
      load('refresh');
    } catch (e: any) {
      if (e instanceof ClientAuthError) { goLogin(); return; }
      Alert.alert('Could not update', e?.message || 'Failed to send your response.');
    } finally {
      setRespondingId(null);
    }
  };

  const confirmRespond = (c: any, action: 'confirmed' | 'rejected') => {
    if (action === 'confirmed') { respond(String(c.id), action); return; }
    Alert.alert('Decline event', `Decline "${c.name || 'this event'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => respond(String(c.id), action) },
    ]);
  };

  const signOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await clientSignOut();
          router.replace('/(guest)' as never);
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Loading your portal..." />;
  if (error || !overview) {
    return <CliErrorState message={error ?? undefined} onRetry={() => { setLoading(true); load(); }} />;
  }

  const firstName = pick<string>(session, 'firstName', 'first_name');
  const today = todayKey();
  const upcoming = events
    .filter((e) => dateKey(e.date) >= today && resolveEventStatus(e) !== 'cancelled')
    .sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)))
    .slice(0, 3);

  const unpaid = overview.invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
  const isOverdue = (i: any) => !!i.due_date && dateKey(i.due_date) < today;
  const overdue = unpaid.filter(isOverdue);
  const totalDue = unpaid.reduce((sum, i) => sum + num(i.amount_due ?? i.total_amount), 0);
  const pendingEstimates = overview.estimates.filter((e) => e.status === 'sent').length;
  const pendingContracts = overview.contracts.filter((c) => c.status === 'sent').length;
  const pendingConfirmations = confirmations.filter((c) => resolveEventStatus(c) !== 'cancelled');

  const go = (path: string) => router.push(path as never);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={Colors.primary} />}
    >
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Welcome back{firstName ? `, ${firstName}` : ''}!</Text>
        <Text style={styles.bannerSub}>Here&apos;s everything you need to know about your upcoming events.</Text>
      </View>

      {pendingConfirmations.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Needs your confirmation" subtitle="Confirm or decline events your coordinator scheduled" />
          {pendingConfirmations.map((c) => {
            const busy = respondingId === String(c.id);
            const time = formatTimeRange(c.start_time, c.end_time);
            return (
              <View key={c.id} style={[styles.card, Shadow.sm]}>
                <Text style={styles.cardTitle}>{c.name || 'Event'}</Text>
                <Text style={styles.cardMeta}>
                  {[formatDate(c.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), time, c.venue].filter(Boolean).join(' · ')}
                </Text>
                <View style={styles.btnRow}>
                  <AppButton
                    title="Decline"
                    variant="outline"
                    style={styles.btnHalf}
                    disabled={busy}
                    onPress={() => confirmRespond(c, 'rejected')}
                  />
                  <AppButton
                    title="Confirm"
                    style={styles.btnHalf}
                    loading={busy}
                    onPress={() => confirmRespond(c, 'confirmed')}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Invoices" action={{ label: 'View all', onPress: () => go('/(client)/invoices') }} />
        <View style={[styles.card, Shadow.sm, overdue.length > 0 && styles.cardDanger]}>
          {overview.invoices.length === 0 ? (
            <Text style={styles.muted}>No invoices yet. They&apos;ll appear here once your coordinator sends them.</Text>
          ) : unpaid.length === 0 ? (
            <View style={styles.rowCenter}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.paid}>All invoices paid — you&apos;re all set!</Text>
            </View>
          ) : (
            <>
              {overdue.length > 0 && (
                <View style={styles.alert}>
                  <Ionicons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.alertText}>
                    {overdue.length} overdue invoice{overdue.length !== 1 ? 's' : ''} — please pay as soon as possible.
                  </Text>
                </View>
              )}
              {unpaid.slice(0, 3).map((inv) => {
                const late = isOverdue(inv);
                return (
                  <View key={inv.id} style={styles.invRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Invoice #{inv.invoice_number}</Text>
                      {!!inv.due_date && (
                        <Text style={[styles.cardMeta, late && { color: Colors.error }]}>
                          Due {formatDate(inv.due_date)}{late ? ' (overdue)' : ''}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.amount, late && { color: Colors.error }]}>{fmtMoney(inv.amount_due ?? inv.total_amount)}</Text>
                  </View>
                );
              })}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total balance due</Text>
                <Text style={[styles.totalValue, overdue.length > 0 && { color: Colors.error }]}>{fmtMoney(totalDue)}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatCard icon="calendar-outline" label="Events" value={events.length} tint={Colors.primary} bg={Colors.primaryLight} onPress={() => go('/(client)/events')} />
        <StatCard
          icon="document-text-outline"
          label={pendingContracts > 0 ? `Contracts · ${pendingContracts} to sign` : 'Contracts'}
          value={overview.contracts.length}
          tint={Colors.purple}
          bg={Colors.purpleLight}
          onPress={() => go('/(client)/contracts')}
        />
        <StatCard
          icon="reader-outline"
          label={pendingEstimates > 0 ? `Estimates · ${pendingEstimates} pending` : 'Estimates'}
          value={overview.estimates.length}
          tint={Colors.info}
          bg={Colors.infoLight}
          onPress={() => go('/(client)/estimates')}
        />
        <StatCard
          icon="receipt-outline"
          label={totalDue > 0 ? `Invoices · ${fmtMoney(totalDue, 0)} due` : 'Invoices'}
          value={overview.invoices.length}
          tint={Colors.success}
          bg={Colors.successLight}
          onPress={() => go('/(client)/invoices')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Upcoming events" action={{ label: 'View all', onPress: () => go('/(client)/events') }} />
        {upcoming.length === 0 ? (
          <View style={[styles.card, Shadow.sm]}><Text style={styles.muted}>No upcoming events.</Text></View>
        ) : (
          upcoming.map((e) => {
            const status = resolveEventStatus(e);
            const colors = statusColors(status);
            const time = formatTimeRange(e.start_time, e.end_time);
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.card, Shadow.sm]}
                activeOpacity={0.8}
                onPress={() => go(`/(client)/events/${encodeURIComponent(String(e.id))}`)}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={2}>{e.name || 'Event'}</Text>
                  <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.pillText, { color: colors.fg }]}>{statusLabel(status)}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {[formatDate(e.date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }), time].filter(Boolean).join(' · ')}
                </Text>
                {!!e.venue && <Text style={styles.cardMeta}>{e.venue}</Text>}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick links" />
        <View>
          <NetNavRow icon="calendar-outline" title="My Events" subtitle="Details, venue and event team" onPress={() => go('/(client)/events')} />
          <NetNavRow icon="reader-outline" title="Estimates" subtitle="View your cost estimates" tint={Colors.info} tintBg={Colors.infoLight} badge={pendingEstimates} onPress={() => go('/(client)/estimates')} />
          <NetNavRow icon="document-text-outline" title="Contracts" subtitle="Review & sign documents" tint={Colors.purple} tintBg={Colors.purpleLight} badge={pendingContracts} onPress={() => go('/(client)/contracts')} />
          <NetNavRow icon="receipt-outline" title="Invoices" subtitle="View & pay your invoices" tint={Colors.success} tintBg={Colors.successLight} badge={overdue.length} onPress={() => go('/(client)/invoices')} />
          <NetNavRow icon="chatbubbles-outline" title="Messages" subtitle="Chat with your event team" onPress={() => go('/(client)/messages')} />
          <NetNavRow icon="storefront-outline" title="Vendors" subtitle="See who's working your event" tint={Colors.warning} tintBg={Colors.warningLight} onPress={() => go('/(client)/vendors')} />
          <NetNavRow icon="cube-outline" title="Items & Packages" subtitle="Browse add-ons and packages" onPress={() => go('/(client)/items')} />
          <NetNavRow icon="people-outline" title="RSVP" subtitle="Manage your guest responses" tint={Colors.purple} tintBg={Colors.purpleLight} onPress={() => go('/(client)/rsvp')} />
          <NetNavRow icon="notifications-outline" title="Notifications" subtitle="Your latest updates" tint={Colors.error} tintBg={Colors.errorLight} badge={unread} onPress={() => go('/(client)/notifications')} />
        </View>
      </View>

      <AppButton title="Sign out" variant="outline" onPress={signOut} style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  banner: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: 20, marginBottom: 16 },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textWhite },
  bannerSub: { fontSize: 13, color: Colors.primaryLight, marginTop: 4, lineHeight: 18 },
  section: { marginBottom: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10 },
  cardDanger: { borderWidth: 1, borderColor: Colors.error },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  muted: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 6 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnHalf: { flex: 1, minHeight: 44, paddingVertical: 10 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  paid: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.successText },
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.errorLight,
    borderRadius: Radius.md, padding: 10, marginBottom: 10,
  },
  alertText: { flex: 1, fontSize: 13, color: Colors.errorText },
  invRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.successText },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  totalValue: { fontSize: 18, fontWeight: '700', color: Colors.successText },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '48%', flexGrow: 1, borderRadius: Radius.lg, padding: 14, gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  signOut: { marginTop: 8 },
});
