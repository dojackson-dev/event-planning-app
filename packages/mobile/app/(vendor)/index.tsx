import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';

interface VendorAccount {
  id: string;
  business_name: string;
  category?: string;
  is_verified?: boolean;
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
      <TouchableOpacity
        style={[styles.navCard, Shadow.sm]}
        onPress={() => router.push('/(vendor)/bookings' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Bookings</Text>
          <Text style={styles.navSubtitle}>View and manage your confirmed bookings</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navCard, Shadow.sm]}
        onPress={() => router.push('/(vendor)/booking-requests' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="mail-unread-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Booking Requests</Text>
          <Text style={styles.navSubtitle}>Review and respond to new requests</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navCard, Shadow.sm]}
        onPress={() => router.push('/(vendor)/profile' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Business Profile</Text>
          <Text style={styles.navSubtitle}>View and edit your vendor profile</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navCard, Shadow.sm]}
        onPress={() => router.push('/(vendor)/invoices' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Invoices</Text>
          <Text style={styles.navSubtitle}>Create and track invoices for clients</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navCard, Shadow.sm]}
        onPress={() => router.push('/(vendor)/booking-link' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="link-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.navTextWrap}>
          <Text style={styles.navTitle}>Booking Link</Text>
          <Text style={styles.navSubtitle}>Share a public link for clients to book you</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  retryWrap: { paddingHorizontal: 32, marginTop: -20 },

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

  navCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 14, marginBottom: 10,
  },
  navIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  navTextWrap: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  navSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});
