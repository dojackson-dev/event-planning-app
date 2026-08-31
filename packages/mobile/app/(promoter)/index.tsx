import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import SectionHeader from '@/components/SectionHeader';
import { PromoterProfile } from '@/types/promoter';

export default function PromoterDashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<PromoterProfile | null>('/promoter/profile');
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load promoter profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <AppButton title="Retry" onPress={fetchProfile} variant="outline" style={styles.retryBtn} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
    >
      {!profile ? (
        <EmptyState
          icon="megaphone-outline"
          title="No promoter profile yet"
          message="We couldn't find a promoter profile for your account. Contact support if you believe this is a mistake."
        />
      ) : (
        <>
          <SectionHeader title="Welcome back" subtitle={profile.company_name || profile.contact_name} />

          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="megaphone" size={22} color={Colors.purple} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{profile.company_name || profile.contact_name}</Text>
              <Text style={styles.cardSubtitle}>{profile.email}</Text>
            </View>
          </View>

          <AppButton
            title="My Events"
            onPress={() => router.push('/(promoter)/events' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="Calendar"
            onPress={() => router.push('/(promoter)/calendar' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="Book an Artist"
            onPress={() => router.push('/(promoter)/artists' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="My Artist Bookings"
            onPress={() => router.push('/(promoter)/bookings' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="Book a Vendor"
            onPress={() => router.push('/(promoter)/vendors' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="My Vendor Bookings"
            onPress={() => router.push('/(promoter)/vendor-bookings' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="Invoices"
            onPress={() => router.push('/(promoter)/invoices' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="Artist Bills"
            onPress={() => router.push('/(promoter)/artist-bills' as any)}
            variant="secondary"
            style={styles.profileBtn}
          />

          <AppButton
            title="View / Edit Profile"
            onPress={() => router.push('/(promoter)/profile' as any)}
            variant="primary"
            style={styles.profileBtn}
          />
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

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16,
    marginHorizontal: 16, marginBottom: 20, ...Shadow.sm,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.purpleLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  profileBtn: { marginHorizontal: 16 },
});
