import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';

type Props = {
  role: 'vendor' | 'artist' | 'promoter';
  email?: string | null;
};

const STATUS_COPY: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Payouts active', color: Colors.successText, bg: Colors.successLight },
  pending: { label: 'Setup incomplete', color: Colors.warningText, bg: Colors.warningLight },
  restricted: { label: 'Action required', color: Colors.errorText, bg: Colors.errorLight },
  not_connected: { label: 'Not connected', color: Colors.textSecondary, bg: Colors.borderLight },
};

// Read-only Stripe Connect status. Onboarding opens the Stripe-hosted page
// returned by the backend; no card/bank data is ever handled in-app.
export default function NetPayoutsCard({ role, email }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<{ status?: string }>(`/stripe/connect/${role}/status`);
      setStatus(data?.status || 'not_connected');
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const openOnboarding = async () => {
    setOpening(true);
    try {
      const resolved = email || (await supabase.auth.getUser()).data.user?.email;
      if (!resolved) {
        Alert.alert('Email required', 'Add an email to your profile before setting up payouts.');
        return;
      }
      const data = await apiRequest<{ url?: string }>(`/stripe/connect/${role}`, {
        method: 'POST',
        body: { email: resolved },
      });
      if (data?.url) await Linking.openURL(data.url);
      else Alert.alert('Error', 'No onboarding link was returned.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not start payout setup.');
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.card, Shadow.sm]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }
  if (status === null) return null;

  const copy = STATUS_COPY[status] || STATUS_COPY.not_connected;
  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.top}>
        <Ionicons name="card-outline" size={20} color={Colors.primary} />
        <Text style={styles.title}>Payouts (Stripe)</Text>
        <View style={[styles.badge, { backgroundColor: copy.bg }]}>
          <Text style={[styles.badgeText, { color: copy.color }]}>{copy.label}</Text>
        </View>
      </View>
      {status !== 'active' && (
        <>
          <Text style={styles.hint}>
            Connect a Stripe account to receive payments. Setup opens in your browser.
          </Text>
          <AppButton
            title={status === 'not_connected' ? 'Set Up Payouts' : 'Continue Setup'}
            onPress={openOnboarding}
            loading={opening}
            variant="secondary"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 13, color: Colors.textSecondary },
});
