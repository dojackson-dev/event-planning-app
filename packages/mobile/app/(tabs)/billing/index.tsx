import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Linking, Alert, StyleSheet } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import {
  FRONTEND_URL, cap, errMsg, finStyles as f,
  StatusBadge, ErrorState, ErrorBanner, Section, InfoRow, ActionButton,
} from '@/components/FinUI';

interface Subscription {
  status: string;
  planId: string | null;
  planName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  venueLimit?: number | null;
  teamMemberLimit?: number | null;
}

interface ConnectStatus {
  status: string;
  connectId: string | null;
}

// Display copy mirrors the web billing page; checkout itself always happens in Stripe-hosted pages.
const PLANS = [
  { id: 'free', name: 'Free', price: '$0', blurb: '1 venue · no team members', fee: 'Recipient pays 3% platform fee on direct payments' },
  { id: 'pro', name: 'Pro', price: '$149/mo', blurb: 'Up to 3 venues · 3 team members', fee: 'Recipient pays 1.5% platform fee on direct payments' },
  { id: 'premium', name: 'Premium', price: '$299/mo', blurb: 'Up to 5 venues · 5 team members', fee: 'Recipient pays 1% platform fee on direct payments' },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', blurb: 'Custom venue & team limits', fee: 'Customizable rates and onboarding support' },
];

const connectLabel = (status?: string) =>
  status === 'active' ? 'Connected' : status === 'pending' ? 'Pending' : 'Not connected';

export default function BillingScreen() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [ownerAccountId, setOwnerAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [account, connectRes] = await Promise.all([
        apiRequest<{ ownerAccountId?: string | number | null }>('/owner/account-id'),
        apiRequest<ConnectStatus>('/stripe/connect/owner/status'),
      ]);
      setConnect(connectRes);
      const accountId = account?.ownerAccountId ? String(account.ownerAccountId) : null;
      setOwnerAccountId(accountId);
      if (accountId) {
        setSubscription(await apiRequest<Subscription>(`/stripe/subscription?ownerAccountId=${encodeURIComponent(accountId)}`));
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load billing information'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Opens a Stripe-hosted page whose URL the backend created for us. No card data is handled in the app.
  const openStripe = async (key: string, path: string, body: any, failMsg: string) => {
    setBusy(key);
    try {
      const res = await apiRequest<{ url?: string }>(path, { method: 'POST', body });
      if (!res?.url) throw new Error(failMsg);
      await Linking.openURL(res.url);
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, failMsg));
    } finally {
      setBusy(null);
    }
  };

  const openPortal = () => {
    if (!ownerAccountId) return;
    openStripe('portal', '/stripe/billing-portal', { ownerAccountId }, 'Failed to open the billing portal');
  };

  const openConnect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { Alert.alert('Error', 'Could not determine your account email.'); return; }
    openStripe('connect', '/stripe/connect/owner', { email: user.email }, 'Failed to start payout setup');
  };

  const openWebBilling = () =>
    Linking.openURL(`${FRONTEND_URL}/dashboard/billing`).catch(() => Alert.alert('Error', 'Could not open the website.'));

  if (loading) return <><Stack.Screen options={{ title: 'Billing & Subscription' }} /><LoadingState message="Loading billing..." /></>;
  if (error && !subscription && !connect) {
    return <><Stack.Screen options={{ title: 'Billing & Subscription' }} /><ErrorState message={error} onRetry={load} /></>;
  }

  const planKey = (subscription?.planName || 'free').toLowerCase();
  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';
  const subStatus = subscription?.status === 'none' || subscription?.status === 'inactive' ? 'inactive' : subscription?.status || 'none';

  return (
    <>
      <Stack.Screen options={{ title: 'Billing & Subscription' }} />
      <ScrollView
        style={f.container}
        contentContainerStyle={f.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.primary} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {!!error && <View style={{ marginHorizontal: -16, marginBottom: 12 }}><ErrorBanner message={error} onRetry={load} /></View>}

        {connect?.status !== 'active' && (
          <View style={styles.notice}>
            <Ionicons name="link-outline" size={20} color={Colors.infoText} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>
                {connect?.status === 'pending' ? 'Finish setting up your payout account' : 'Add your banking information to get paid'}
              </Text>
              <Text style={styles.noticeText}>
                Connect your bank via Stripe to accept client payments and receive payouts. This is required even on the Free plan.
              </Text>
              <View style={{ marginTop: 10 }}>
                <ActionButton icon="open-outline" label={connect?.status === 'pending' ? 'Continue Setup' : 'Add Banking Info'} onPress={openConnect} loading={busy === 'connect'} />
              </View>
            </View>
          </View>
        )}

        <View style={f.headerCard}>
          <View style={f.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={f.headerSub}>Current plan</Text>
              <Text style={f.headerName}>EventEcos {cap(subscription?.planName || 'free')}</Text>
            </View>
            <StatusBadge status={subStatus} label={subStatus === 'trialing' ? 'Free Trial' : subStatus === 'none' ? 'No Plan' : undefined} />
          </View>
          {subscription?.venueLimit != null && (
            <Text style={f.progressText}>
              {subscription.venueLimit} {subscription.venueLimit === 1 ? 'venue' : 'venues'} · {subscription.teamMemberLimit ?? 0} team {(subscription.teamMemberLimit ?? 0) === 1 ? 'member' : 'members'}
            </Text>
          )}
          <View style={[f.actionRow, { marginTop: 14, marginBottom: 0 }]}>
            {!!subscription?.stripeCustomerId && (
              <ActionButton icon="card-outline" label="Manage Subscription" onPress={openPortal} loading={busy === 'portal'} />
            )}
            {!isSubscribed && (
              <ActionButton icon="rocket-outline" label="Upgrade on the web" tone="neutral" onPress={openWebBilling} />
            )}
          </View>
        </View>

        <Section title="Payout account (Stripe Connect)">
          <InfoRow label="Status" value={connectLabel(connect?.status)} valueColor={connect?.status === 'active' ? Colors.successText : Colors.warningText} last />
        </Section>

        <Text style={styles.sectionLabel}>Plans</Text>
        {PLANS.map(plan => {
          const current = plan.id === planKey || (plan.id === 'free' && !isSubscribed);
          return (
            <View key={plan.id} style={[styles.planCard, current && styles.planCardCurrent]}>
              <View style={styles.planTop}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
              <Text style={styles.planBlurb}>{plan.blurb}</Text>
              <Text style={styles.planFee}>{plan.fee}</Text>
              {current && <Text style={styles.planCurrent}>Your current plan</Text>}
            </View>
          );
        })}
        <Text style={[f.lineMeta, { marginTop: 4 }]}>
          To subscribe or change plan, use Manage Subscription or visit {FRONTEND_URL.replace('https://', '')}/dashboard/billing. Payments are always handled on Stripe's secure pages.
        </Text>
        {planKey === 'enterprise' || !isSubscribed ? (
          <View style={{ marginTop: 12 }}>
            <ActionButton icon="mail-outline" label="Contact us about Enterprise" tone="neutral"
              onPress={() => Linking.openURL('mailto:hello@eventecos.com?subject=Enterprise%20Plan%20Inquiry')} />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row', gap: 12, backgroundColor: Colors.infoLight, borderRadius: Radius.lg,
    padding: 14, marginBottom: 16,
  },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: Colors.infoText },
  noticeText: { fontSize: 13, color: Colors.infoText, marginTop: 2, lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  planCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  planCardCurrent: { borderColor: Colors.primary, borderWidth: 2 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  planPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  planBlurb: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  planFee: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  planCurrent: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginTop: 6 },
});
