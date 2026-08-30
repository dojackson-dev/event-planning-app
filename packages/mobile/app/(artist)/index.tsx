import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';

interface ArtistProfile {
  id: string;
  artist_name: string;
  stage_name: string | null;
  artist_type: string;
  available_for_booking: boolean;
}

export default function ArtistDashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<ArtistProfile | null>('/artists/me/profile');
      setProfile(data ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to load your artist dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

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

      <SectionHeader title="Manage" />
        <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(artist)/invoices' as any)} activeOpacity={0.8}>
          <View style={[styles.navIcon, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="receipt-outline" size={22} color={Colors.success} />
          </View>
          <Text style={styles.navTitle}>Invoices</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>      <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(artist)/bookings' as any)} activeOpacity={0.8}>
      <View style={[styles.navIcon, { backgroundColor: Colors.successLight }]}>
        <Ionicons name="calendar-outline" size={22} color={Colors.success} />
      </View>
      <View style={styles.navText}>
        <Text style={styles.navTitle}>Bookings</Text>
        <Text style={styles.navSubtitle}>Your bookings & promoter gig requests</Text>
      </View>
    </TouchableOpacity>

    <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(artist)/profile' as any)} activeOpacity={0.8}>
        <View style={[styles.navIcon, { backgroundColor: Colors.primaryLight }]}>
          <Ionicons name="person-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.navText}>
          <Text style={styles.navTitle}>My Profile</Text>
          <Text style={styles.navSubtitle}>Stage name, bio, contact & booking info</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(artist)/calendar' as any)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 6 }}>Calendar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navCard} onPress={() => router.push('/(artist)/rider' as any)} activeOpacity={0.8}>
        <View style={[styles.navIcon, { backgroundColor: Colors.purpleLight }]}>
          <Ionicons name="document-text-outline" size={22} color={Colors.purple} />
        </View>
        <View style={styles.navText}>
          <Text style={styles.navTitle}>My Rider</Text>
          <Text style={styles.navSubtitle}>Technical & hospitality requirements</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
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
  navCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12, ...Shadow.sm,
  },
  navIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  navText: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  navSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  retryBtn: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryText: { color: '#FFF', fontWeight: '600' },
});
