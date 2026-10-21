import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import {
  CliDocBadge, CliDocError, CliDocCard, CliDocRow, ESTIMATE_STATUS, useCliDocLoad, useClientAuthRedirect,
  pick, num, money, fmtDate,
} from '@/components/CliDocUI';

interface Item {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

interface Estimate {
  id: string;
  status: string;
  number?: string;
  notes?: string;
  terms?: string;
  issueDate?: string;
  expiration?: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  items: Item[];
}

function normalize(e: any): Estimate {
  const rawItems = pick(e, 'items');
  const items: Item[] = (Array.isArray(rawItems) ? rawItems : []).map((it: any, i: number) => {
    const qty = pick(it, 'quantity') ?? 1;
    const unit = num(pick(it, 'unit_price'));
    return {
      key: String(it?.id ?? i),
      description: String(it?.description ?? it?.name ?? ''),
      quantity: num(qty) || 1,
      unitPrice: unit,
      discount: num(pick(it, 'discount_amount')),
      amount: num(pick(it, 'amount') ?? pick(it, 'subtotal') ?? unit * num(qty)),
    };
  });
  return {
    id: String(e.id),
    status: String(e?.status ?? 'draft'),
    number: pick(e, 'estimate_number'),
    notes: e?.notes,
    terms: e?.terms,
    issueDate: pick(e, 'issue_date'),
    expiration: pick(e, 'expiration_date'),
    subtotal: num(pick(e, 'subtotal')),
    discount: num(pick(e, 'discount_amount')),
    taxRate: num(pick(e, 'tax_rate')),
    tax: num(pick(e, 'tax_amount')),
    total: num(pick(e, 'total_amount')),
    items,
  };
}

export default function ClientEstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const redirectOnAuth = useClientAuthRedirect();
  const [responding, setResponding] = useState(false);
  const { data, setData, loading, refreshing, error, reload, refresh } = useCliDocLoad<Estimate>(async () =>
    normalize(await clientApi(`/estimates/${id}`)),
  );

  // Lets the coordinator know the estimate was opened; failures are irrelevant to the client.
  useEffect(() => {
    if (!id) return;
    clientApi(`/estimates/${id}/viewed`, { method: 'POST', body: {} }).catch(() => {});
  }, [id]);

  const respond = (action: 'approved' | 'rejected') => {
    const verb = action === 'approved' ? 'approve' : 'decline';
    Alert.alert(
      `${action === 'approved' ? 'Approve' : 'Decline'} estimate?`,
      `Are you sure you want to ${verb} this estimate?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approved' ? 'Approve' : 'Decline',
          style: action === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setResponding(true);
            try {
              await clientApi(`/estimates/${id}/respond`, { method: 'POST', body: { action } });
              setData((prev) => (prev ? { ...prev, status: action } : prev));
              Alert.alert(
                action === 'approved' ? 'Estimate approved' : 'Estimate declined',
                'Your coordinator has been notified.',
              );
            } catch (err: any) {
              if (redirectOnAuth(err)) return;
              Alert.alert(`Could not ${verb} estimate`, `${err?.message || 'Unknown error'}. Please try again or contact your coordinator.`);
            } finally {
              setResponding(false);
            }
          },
        },
      ],
    );
  };

  if (loading) return <LoadingState message="Loading estimate..." />;
  if (error && !data) return <CliDocError message={error} onRetry={reload} />;
  if (!data) return <CliDocError message="Estimate not found." onRetry={reload} />;

  const cfg = ESTIMATE_STATUS[data.status] ?? ESTIMATE_STATUS.draft;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
    >
      <CliDocCard>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Estimate</Text>
            <Text style={styles.h1}>#{data.number ?? data.id.slice(0, 8)}</Text>
          </View>
          <CliDocBadge cfg={cfg} />
        </View>
        {data.notes ? <Text style={styles.sub}>{data.notes}</Text> : null}
        <CliDocRow label="Issue date" value={fmtDate(data.issueDate)} />
        <CliDocRow label="Expires" value={fmtDate(data.expiration)} />
        <CliDocRow label="Total" value={money(data.total)} bold />
      </CliDocCard>

      {data.items.length > 0 && (
        <View>
          <SectionHeader title="Line Items" />
          <CliDocCard style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
            {data.items.map((it, idx) => (
              <View key={it.key} style={[styles.item, idx > 0 && styles.itemBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.description}</Text>
                  <Text style={styles.muted}>{it.quantity} × {money(it.unitPrice)}</Text>
                  {it.discount > 0 && <Text style={styles.discount}>Discount −{money(it.discount)}</Text>}
                </View>
                <Text style={styles.itemAmount}>{money(it.amount)}</Text>
              </View>
            ))}
            <View style={styles.totals}>
              <CliDocRow label="Subtotal" value={money(data.subtotal)} />
              {data.discount > 0 && (
                <CliDocRow label="Additional discount" value={`−${money(data.discount)}`} color={Colors.successText} />
              )}
              {data.tax > 0 && <CliDocRow label={`Tax (${data.taxRate}%)`} value={money(data.tax)} />}
              <View style={styles.totalLine}>
                <CliDocRow label="Total" value={money(data.total)} bold />
              </View>
            </View>
          </CliDocCard>
        </View>
      )}

      {data.terms ? (
        <CliDocCard>
          <Text style={styles.cardTitle}>Terms</Text>
          <Text style={styles.body}>{data.terms}</Text>
        </CliDocCard>
      ) : null}

      {data.status === 'sent' && (
        <CliDocCard>
          <Text style={styles.cardTitle}>Your Response</Text>
          <Text style={styles.sub}>Review the estimate above and let your coordinator know if you accept.</Text>
          <AppButton
            title="Approve Estimate"
            onPress={() => respond('approved')}
            loading={responding}
            style={{ backgroundColor: Colors.success }}
          />
          <AppButton title="Decline" variant="outline" onPress={() => respond('rejected')} disabled={responding}
            style={{ borderColor: Colors.error }} textStyle={{ color: Colors.error }} />
        </CliDocCard>
      )}
      {data.status === 'approved' && <Text style={[styles.result, { color: Colors.successText }]}>You approved this estimate.</Text>}
      {data.status === 'rejected' && <Text style={[styles.result, { color: Colors.errorText }]}>You declined this estimate.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  muted: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  discount: { fontSize: 12, color: Colors.successText, marginTop: 2 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 16 },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemAmount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totals: { padding: 16, gap: 6, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLine: { paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  result: { fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 8, borderRadius: Radius.md },
});
