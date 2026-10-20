import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import NetNavRow from '@/components/NetNavRow';
import NetPayoutsCard from '@/components/NetPayoutsCard';
import NetSignOutButton from '@/components/NetSignOutButton';

interface VendorAccount {
  id: string;
  business_name: string;
  category?: string;
  is_verified?: boolean;
  email?: string;
}

interface VendorBooking {
  id: string;
  status: string;
  event_name?: string;
  event_date?: string;
  agreed_amount?: number;
}

export default function VendorDashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorAccount | null>(null);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [profileMissing, setProfileMissing] = useState(false);

  const loadData = useCallback(async () => {
    setError('');
    setProfileMissing(false);
    try {
      const [profileResult, bookingsResult] = await Promise.allSettled([
        apiRequest<VendorAccount>('/vendors/account/me'),
        apiRequest<VendorBooking[]>('/vendors/bookings/mine'),
      ]);

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      } else {
        const message = profileResult.reason?.message || '';
        if (/404|not found/i.test(message)) {
          setProfileMissing(true);
        } else {
          throw profileResult.reason;
        }
      }

      if (bookingsResult.status === 'fulfilled') {
        setBookings(bookingsResult.value || []);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load your vendor dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load dashboard"
          message={error}
        />
        <View style={styles.retryWrap}>
          <AppButton title="Try Again" onPress={loadData} variant="outline" />
        </View>
      </View>
    );
  }

  if (profileMissing) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="storefront-outline"
          title="Set up your vendor profile"
          message="We couldn't find a vendor profile for your account yet. Complete your profile to start receiving bookings."
        />
        <View style={styles.retryWrap}>
          <AppButton title="Go to Profile" onPress={() => router.push('/(vendor)/profile' as any)} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="storefront" size={28} color={Colors.textWhite} />
        </View>
        <Text style={styles.heroBusiness}>{profile?.business_name || 'Your Business'}</Text>
        {profile?.category && (
          <Text style={styles.heroCategory}>{profile.category.replace(/_/g, ' ')}</Text>
        )}
      </View>

      <SectionHeader title="Overview" />
      <View style={styles.statsRow}>
        <View style={[styles.statCard, Shadow.sm]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, Shadow.sm]}>
          <Text style={styles.statNumber}>{confirmedCount}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statCard, Shadow.sm]}>
          <Text style={styles.statNumber}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {bookings.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message="When a venue owner or client books your services, it will show up here."
        />
      )}

      <SectionHeader title="Manage" />
      <NetNavRow
        icon="calendar-outline"
        title="Bookings"
        subtitle="View and manage your bookings"
        onPress={() => router.push('/(vendor)/bookings' as any)}
      />
      <NetNavRow
        icon="mail-unread-outline"
        title="Booking Requests"
        subtitle="Review and respond to new requests"
        onPress={() => router.push('/(vendor)/booking-requests' as any)}
      />
      <NetNavRow
        icon="today-outline"
        title="Calendar"
        subtitle="Your upcoming booked dates"
        onPress={() => router.push('/(vendor)/calendar' as any)}
      />
      <NetNavRow
        icon="document-text-outline"
        title="Invoices"
        subtitle="Create and track invoices for clients"
        onPress={() => router.push('/(vendor)/invoices' as any)}
      />
      <NetNavRow
        icon="trending-up-outline"
        title="Earnings"
        subtitle="Revenue, paid and outstanding"
        onPress={() => router.push('/(vendor)/earnings' as any)}
      />
      <NetNavRow
        icon="star-outline"
        title="Reviews"
        subtitle="What clients say about you"
        onPress={() => router.push('/(vendor)/reviews' as any)}
      />
      <NetNavRow
        icon="document-lock-outline"
        title="Contracts"
        subtitle="View and sign contracts sent by venues"
        onPress={() => router.push('/(vendor)/contracts' as any)}
      />
      <NetNavRow
        icon="link-outline"
        title="Booking Link"
        subtitle="Share a public link for clients to book you"
        onPress={() => router.push('/(vendor)/booking-link' as any)}
      />
      <NetNavRow
        icon="person-circle-outline"
        title="Business Profile"
        subtitle="View and edit your vendor profile"
        onPress={() => router.push('/(vendor)/profile' as any)}
      />

      <SectionHeader title="Payouts" />
      <NetPayoutsCard role="vendor" email={profile?.email} />

      <View style={styles.signOutWrap}>
        <NetSignOutButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  retryWrap: { paddingHorizontal: 32, marginTop: -20 },
  signOutWrap: { marginTop: 12 },

  heroCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
    alignItems: 'center', paddingVertical: 28, marginBottom: 20,
  },
  heroIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  heroBusiness: { fontSize: 20, fontWeight: '800', color: Colors.textWhite },
  heroCategory: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, textTransform: 'capitalize' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center',
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

});
