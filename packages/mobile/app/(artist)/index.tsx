import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';
import EccoAssistant from '@/components/EccoAssistant';
import NetNavRow from '@/components/NetNavRow';
import NetPayoutsCard from '@/components/NetPayoutsCard';
import NetSignOutButton from '@/components/NetSignOutButton';
import { toList } from '@/components/netFormat';

interface ArtistProfile {
  id: string;
  artist_name: string;
  stage_name: string | null;
  artist_type: string;
  available_for_booking: boolean;
  booking_email?: string | null;
}

export default function ArtistDashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [gigs, setGigs] = useState<{ status: string; event_date?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eccoKey, setEccoKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<ArtistProfile | null>('/artists/me/profile');
      setProfile(data ?? null);
      const [own, promoter] = await Promise.allSettled([
        apiRequest<any>('/artist-bookings/mine'),
        apiRequest<any>('/promoter-bookings/for-artist'),
      ]);
      setGigs([
        ...(own.status === 'fulfilled' ? toList(own.value, 'bookings') : []),
        ...(promoter.status === 'fulfilled' ? toList(promoter.value, 'bookings') : []),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load your artist dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); setEccoKey((k) => k + 1); load(); };

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  if (error) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="alert-circle-outline" title="Something went wrong" message={error} />
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const pending = gigs.filter((g) => ['pending', 'inquiry'].includes(g.status)).length;
  const upcoming = gigs.filter((g) => g.status === 'confirmed' && (g.event_date || '') >= today).length;
  const total = gigs.length;
  const displayName = profile?.stage_name || profile?.artist_name;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.welcomeCard}>
        {profile ? (
          <>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{displayName}</Text>
            {profile.artist_type && <Text style={styles.welcomeType}>{profile.artist_type}</Text>}
          </>
        ) : (
          <EmptyState
            icon="person-add-outline"
            title="Set up your artist profile"
            message="Complete your profile so promoters and venues can find and book you."
          />
        )}
      </View>

      {pending > 0 && (
        <TouchableOpacity style={[styles.alert, Shadow.sm]} onPress={() => router.push('/(artist)/bookings' as any)} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={Colors.warningText} />
          <Text style={styles.alertText}>
            {pending} promoter gig request{pending === 1 ? '' : 's'} awaiting your response
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.warningText} />
        </TouchableOpacity>
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statCard, Shadow.sm]}>
          <Text style={styles.statNumber}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, Shadow.sm]}>
          <Text style={styles.statNumber}>{upcoming}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={[styles.statCard, Shadow.sm]}>
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <EccoAssistant role="artist" refreshKey={eccoKey} />

      <SectionHeader title="Manage" />
      <NetNavRow icon="calendar-outline" title="Bookings" subtitle="Your bookings & promoter gig requests" onPress={() => router.push('/(artist)/bookings' as any)} />
      <NetNavRow icon="today-outline" title="Calendar" subtitle="Your upcoming gigs" onPress={() => router.push('/(artist)/calendar' as any)} />
      <NetNavRow icon="receipt-outline" title="Invoices" subtitle="Create and track invoices" onPress={() => router.push('/(artist)/invoices' as any)} tint={Colors.success} tintBg={Colors.successLight} />
      <NetNavRow icon="document-text-outline" title="My Rider" subtitle="Technical & hospitality requirements" onPress={() => router.push('/(artist)/rider' as any)} tint={Colors.purple} tintBg={Colors.purpleLight} />
      <NetNavRow icon="link-outline" title="Booking Link" subtitle="Share a public link for promoters & clients to book you" onPress={() => router.push('/(artist)/booking-link' as any)} />
      <NetNavRow icon="person-outline" title="My Profile" subtitle="Stage name, bio, contact & booking info" onPress={() => router.push('/(artist)/profile' as any)} />

      <SectionHeader title="Payouts" />
      <NetPayoutsCard role="artist" email={profile?.booking_email} />

      <View style={styles.signOutWrap}>
        <NetSignOutButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 16 },
  welcomeCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 20, ...Shadow.md },
  welcomeLabel: { fontSize: 13, color: Colors.textSecondary },
  welcomeName: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  welcomeType: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 6, textTransform: 'capitalize' },
  signOutWrap: { marginTop: 12 },
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warningLight,
    borderRadius: Radius.lg, padding: 12, marginBottom: 12,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.warningText },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  retryBtn: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryText: { color: '#FFF', fontWeight: '600' },
});
