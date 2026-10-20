import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import SectionHeader from '@/components/SectionHeader';
import NetNavRow from '@/components/NetNavRow';
import NetPayoutsCard from '@/components/NetPayoutsCard';
import NetSignOutButton from '@/components/NetSignOutButton';
import { fmtMoney } from '@/components/netFormat';
import { PromoterProfile } from '@/types/promoter';

interface DashboardStats {
  totalEvents: number;
  publishedEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

export default function PromoterDashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, s] = await Promise.allSettled([
        apiRequest<PromoterProfile | null>('/promoter/profile'),
        apiRequest<DashboardStats>('/promoter/dashboard'),
      ]);
      if (p.status === 'rejected') throw p.reason;
      setProfile(p.value);
      setStats(s.status === 'fulfilled' ? s.value : null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load promoter profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <AppButton title="Retry" onPress={() => { setLoading(true); load(); }} variant="outline" style={styles.retryBtn} />
        <NetSignOutButton />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.purple} />}
    >
      {!profile ? (
        <>
          <EmptyState
            icon="megaphone-outline"
            title="No promoter profile yet"
            message="We couldn't find a promoter profile for your account. Contact support if you believe this is a mistake."
          />
          <NetSignOutButton />
        </>
      ) : (
        <>
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.iconWrap}>
              <Ionicons name="megaphone" size={22} color={Colors.purple} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>Welcome back</Text>
              <Text style={styles.cardTitle}>{profile.company_name || profile.contact_name}</Text>
              <Text style={styles.cardSubtitle}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, Shadow.sm]}>
              <Text style={styles.statNumber}>{stats?.totalEvents ?? 0}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={[styles.statCard, Shadow.sm]}>
              <Text style={styles.statNumber}>{stats?.publishedEvents ?? 0}</Text>
              <Text style={styles.statLabel}>Published</Text>
            </View>
            <View style={[styles.statCard, Shadow.sm]}>
              <Text style={styles.statNumber}>{stats?.totalTicketsSold ?? 0}</Text>
              <Text style={styles.statLabel}>Tickets Sold</Text>
            </View>
            <View style={[styles.statCard, Shadow.sm]}>
              <Text style={styles.statNumber}>{fmtMoney(stats?.totalRevenue ?? 0, 0)}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>

          <AppButton
            title="Create Event"
            onPress={() => router.push('/(promoter)/events/new' as any)}
            style={styles.createBtn}
          />

          <SectionHeader title="Events & Sales" />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="ticket-outline" title="My Events" subtitle="Tickets, VIP, attendees & check-in" onPress={() => router.push('/(promoter)/events' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="calendar-outline" title="Calendar" onPress={() => router.push('/(promoter)/calendar' as any)} />

          <SectionHeader title="Book Talent" />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="mic-outline" title="Book an Artist" onPress={() => router.push('/(promoter)/artists' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="people-outline" title="My Artist Bookings" onPress={() => router.push('/(promoter)/bookings' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="storefront-outline" title="Book a Vendor" onPress={() => router.push('/(promoter)/vendors' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="briefcase-outline" title="My Vendor Bookings" onPress={() => router.push('/(promoter)/vendor-bookings' as any)} />

          <SectionHeader title="Business" />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="receipt-outline" title="Invoices" onPress={() => router.push('/(promoter)/invoices' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="cash-outline" title="Artist Bills" onPress={() => router.push('/(promoter)/artist-bills' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="document-lock-outline" title="Contracts" onPress={() => router.push('/(promoter)/contracts' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="link-outline" title="Booking Link" subtitle="Let artists and clients request you" onPress={() => router.push('/(promoter)/booking-link' as any)} />
          <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="person-circle-outline" title="Profile" onPress={() => router.push('/(promoter)/profile' as any)} />

          <SectionHeader title="Payouts" />
          <NetPayoutsCard role="promoter" email={profile.email} />

          <View style={styles.signOutWrap}>
            <NetSignOutButton />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, minWidth: 140 },
  signOutWrap: { marginTop: 12 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 14,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.purpleLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 12, color: Colors.textSecondary },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    width: '48%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: Colors.purple },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  createBtn: { backgroundColor: Colors.purple, marginBottom: 12 },
});
