import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import {
  CliDocBadge, CliDocError, CliDocChips, INVOICE_STATUS, useCliDocLoad, useClientAuthRedirect,
  pick, num, money, fmtDate, daysUntil,
} from '@/components/CliDocUI';

const WEB_URL = 'https://eventecos.com';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'sent', label: 'Awaiting Payment' },
  { key: 'partial', label: 'Partial' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];

type PayMethod = 'card' | 'pay_later' | 'bank';
type PayAmount = 'full' | 'deposit';

interface LineItem { key: string; description: string; quantity: number; unitPrice: number; amount: number }

interface Invoice {
  id: string;
  rawStatus: string;
  status: string; // effective status, 'overdue' when past due and unpaid
  open: boolean;
  number?: string;
  fromName?: string;
  clientName?: string;
  issueDate?: string;
  dueDate?: string;
  paidDate?: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  depositPct: number;
  notes?: string;
  items: LineItem[];
  dueSoon: boolean;
  vendorToken?: string;
  payLater: boolean;
  bank: boolean;
}

function normalize(i: any): Invoice {
  const rawStatus = String(i?.status ?? 'sent');
  const open = rawStatus !== 'paid' && rawStatus !== 'cancelled';
  const dueDate = pick(i, 'due_date');
  const days = daysUntil(dueDate);
  const overdue = open && days !== null && days < 0;
  const total = num(pick(i, 'total_amount'));
  const isVendor = i?._type === 'vendor_invoice';
  const items: LineItem[] = (Array.isArray(i?.items) ? i.items : [])
    .filter((it: any) => { const t = pick(it, 'item_type'); return !t || t === 'revenue'; })
    .map((it: any, idx: number) => ({
      key: String(it?.id ?? idx),
      description: String(it?.description ?? ''),
      quantity: num(pick(it, 'quantity')) || 1,
      unitPrice: num(pick(it, 'unit_price')),
      amount: num(pick(it, 'amount')),
    }));
  return {
    id: String(i.id),
    rawStatus,
    status: overdue ? 'overdue' : rawStatus,
    open,
    number: pick(i, 'invoice_number'),
    fromName: pick(i, 'from_name'),
    clientName: pick(i, 'client_name'),
    issueDate: pick(i, 'issue_date'),
    dueDate,
    paidDate: pick(i, 'paid_date'),
    total,
    amountDue: num(pick(i, 'amount_due') ?? total),
    amountPaid: num(pick(i, 'amount_paid')),
    depositPct: isVendor ? 0 : num(pick(i, 'deposit_percentage')),
    notes: i?.notes,
    items,
    dueSoon: open && !overdue && days !== null && days >= 0 && days <= 7,
    vendorToken: isVendor ? pick(i, 'public_token') : undefined,
    payLater: !isVendor && !!pick(i, 'pay_later_available'),
    bank: !isVendor && !!pick(i, 'bank_available'),
  };
}

export default function ClientInvoicesScreen() {
  const redirectOnAuth = useClientAuthRedirect();
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<string | null>(null);
  // Reload when returning from the Stripe-hosted checkout in the browser.
  const { data, loading, refreshing, error, reload, refresh } = useCliDocLoad<Invoice[]>(
    async () => {
      const res = await clientApi<any[]>('/invoices');
      return (Array.isArray(res) ? res : []).map(normalize);
    },
    { refetchOnActive: true },
  );

  const invoices = data ?? [];
  const unpaid = useMemo(() => invoices.filter((i) => i.open), [invoices]);
  const totalDue = unpaid.reduce((s, i) => s + i.amountDue, 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const paidCount = invoices.filter((i) => i.rawStatus === 'paid').length;

  const filtered = useMemo(() => invoices.filter((i) => {
    if (filter === 'all') return true;
    if (filter === 'unpaid') return i.open;
    return i.status === filter;
  }), [invoices, filter]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const openUrl = async (url: string) => {
    if (!/^https:\/\//i.test(url)) throw new Error('Received an invalid payment link.');
    await Linking.openURL(url);
  };

  // Payment happens entirely on Stripe's hosted page; no card data is handled in-app.
  const pay = async (inv: Invoice, method: PayMethod = 'card', amount: PayAmount = 'full') => {
    setPaying(inv.id);
    try {
      if (inv.vendorToken) {
        await openUrl(`${WEB_URL}/pay/${inv.vendorToken}`);
        return;
      }
      const res = await clientApi<{ url?: string }>(`/invoices/${inv.id}/checkout`, {
        method: 'POST',
        body: { pay_method: method, pay_amount: amount },
      });
      if (!res?.url) throw new Error('Payment link was not returned. Please try again.');
      await openUrl(res.url);
    } catch (err: any) {
      if (redirectOnAuth(err)) return;
      Alert.alert('Unable to start payment', err?.message || 'Please try again.');
    } finally {
      setPaying(null);
    }
  };

  if (loading) return <LoadingState message="Loading invoices..." />;
  if (error && !data) return <CliDocError message={error} onRetry={reload} />;

  const header = (
    <View>
      {invoices.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.dueCard}>
            <Text style={styles.dueLabel}>TOTAL BALANCE DUE</Text>
            <Text style={styles.dueAmount}>{money(totalDue)}</Text>
            <Text style={styles.dueSub}>
              {unpaid.length} outstanding invoice{unpaid.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.miniRow}>
            <View style={[styles.mini, overdueCount > 0 && styles.miniRed]}>
              <Text style={[styles.miniNum, overdueCount > 0 && { color: Colors.errorText }]}>{overdueCount}</Text>
              <Text style={[styles.miniLabel, overdueCount > 0 && { color: Colors.errorText }]}>Overdue</Text>
            </View>
            <View style={styles.mini}>
              <Text style={styles.miniNum}>{paidCount}</Text>
              <Text style={styles.miniLabel}>Paid</Text>
            </View>
          </View>
        </View>
      )}
      {overdueCount > 0 && (
        <View style={styles.alert}>
          <Ionicons name="alert-circle" size={18} color={Colors.errorText} />
          <Text style={styles.alertText}>
            You have {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}. Please complete payment as soon as possible.
          </Text>
        </View>
      )}
      <CliDocChips options={FILTERS} value={filter} onChange={setFilter} />
      {error && <Text style={styles.banner}>{error}</Text>}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No invoices found"
            message={invoices.length === 0
              ? 'Your invoices will appear here once your event coordinator sends them.'
              : 'No invoices match this filter.'}
          />
        }
        renderItem={({ item: inv }) => {
          const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.sent;
          const isOpen = expanded.has(inv.id);
          const busy = paying === inv.id;
          const overdue = inv.status === 'overdue';
          const showDeposit = inv.open && inv.depositPct > 0 && inv.amountPaid === 0;
          return (
            <View style={[styles.card, overdue && styles.cardOverdue, inv.dueSoon && styles.cardSoon]}>
              {overdue && <Text style={styles.bannerRed}>OVERDUE — Payment past due</Text>}
              {inv.dueSoon && <Text style={styles.bannerYellow}>Payment due within 7 days</Text>}
              <View style={styles.body}>
                <View style={styles.top}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.title}>Invoice #{inv.number ?? inv.id.slice(0, 8)}</Text>
                    {inv.fromName ? <Text style={styles.muted}>From: {inv.fromName}</Text> : null}
                    {inv.clientName ? <Text style={styles.sub}>{inv.clientName}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {inv.rawStatus !== 'paid' ? (
                      <>
                        <Text style={styles.muted}>Amount Due</Text>
                        <Text style={[styles.amount, overdue && { color: Colors.error }]}>
                          {money(inv.rawStatus === 'cancelled' ? inv.total : inv.amountDue)}
                        </Text>
                        {inv.amountPaid > 0 && <Text style={styles.muted}>{money(inv.amountPaid)} paid</Text>}
                      </>
                    ) : (
                      <>
                        <Text style={styles.muted}>Total</Text>
                        <Text style={[styles.amount, { color: Colors.success }]}>{money(inv.total)}</Text>
                        <Text style={[styles.muted, { color: Colors.successText }]}>Paid in full</Text>
                      </>
                    )}
                  </View>
                </View>

                <CliDocBadge cfg={cfg} />

                <View style={styles.dates}>
                  {inv.issueDate ? <Text style={styles.muted}>Issued {fmtDate(inv.issueDate)}</Text> : null}
                  {inv.dueDate ? (
                    <Text style={[styles.muted, overdue && { color: Colors.errorText, fontWeight: '700' }, inv.dueSoon && { color: Colors.warningText, fontWeight: '600' }]}>
                      Due {fmtDate(inv.dueDate)}
                    </Text>
                  ) : null}
                  {inv.paidDate ? <Text style={[styles.muted, { color: Colors.successText }]}>Paid {fmtDate(inv.paidDate)}</Text> : null}
                </View>

                {inv.items.length > 0 && (
                  <TouchableOpacity onPress={() => toggle(inv.id)} style={styles.toggle} activeOpacity={0.7}>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
                    <Text style={styles.toggleText}>
                      {isOpen ? 'Hide' : 'View'} {inv.items.length} line item{inv.items.length !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                )}
                {isOpen && inv.items.length > 0 && (
                  <View style={styles.items}>
                    {inv.items.map((it, idx) => (
                      <View key={it.key} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{it.description}</Text>
                          <Text style={styles.muted}>{it.quantity} × {money(it.unitPrice)}</Text>
                        </View>
                        <Text style={styles.itemAmt}>{money(it.amount)}</Text>
                      </View>
                    ))}
                    <View style={[styles.itemRow, styles.itemBorder, { backgroundColor: Colors.background }]}>
                      <Text style={[styles.itemName, { flex: 1 }]}>Total</Text>
                      <Text style={styles.itemAmt}>{money(inv.total)}</Text>
                    </View>
                  </View>
                )}

                {inv.notes ? <Text style={styles.notes}>{inv.notes}</Text> : null}

                {inv.open && (
                  <View style={styles.payBox}>
                    {showDeposit && (
                      <AppButton
                        title={`Pay ${inv.depositPct}% deposit (${money(inv.total * inv.depositPct / 100)})`}
                        variant="outline"
                        onPress={() => pay(inv, 'card', 'deposit')}
                        disabled={busy}
                      />
                    )}
                    <AppButton
                      title={`Pay ${money(inv.amountDue)} Now`}
                      onPress={() => pay(inv)}
                      loading={busy}
                      style={overdue ? { backgroundColor: Colors.error } : undefined}
                    />
                    {inv.payLater && (
                      <AppButton
                        title="Pay later with Afterpay, Klarna or Affirm"
                        variant="outline"
                        onPress={() => pay(inv, 'pay_later')}
                        disabled={busy}
                      />
                    )}
                    {inv.bank && (
                      <AppButton
                        title="Pay from a bank account (lower fee)"
                        variant="outline"
                        onPress={() => pay(inv, 'bank')}
                        disabled={busy}
                      />
                    )}
                    <Text style={styles.fee}>
                      {inv.vendorToken
                        ? 'You will complete payment securely on the web.'
                        : 'A payment processing fee is added at checkout: 3.1% + $0.30 for cards, 0.8% (max $5) for a bank account, 6% + $0.30 for pay later. Payment opens in your browser.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 40, flexGrow: 1 },
  summary: { padding: 16, paddingBottom: 4, gap: 10 },
  dueCard: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16, gap: 2 },
  dueLabel: { fontSize: 11, fontWeight: '700', color: Colors.primaryLight, letterSpacing: 0.5 },
  dueAmount: { fontSize: 30, fontWeight: '800', color: Colors.textWhite },
  dueSub: { fontSize: 12, color: Colors.primaryLight },
  miniRow: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 12, borderWidth: 1, borderColor: Colors.border },
  miniRed: { backgroundColor: Colors.errorLight, borderColor: Colors.error },
  miniNum: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  miniLabel: { fontSize: 12, color: Colors.textSecondary },
  alert: { flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.errorLight },
  alertText: { flex: 1, fontSize: 13, color: Colors.errorText },
  banner: { marginHorizontal: 16, marginBottom: 8, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, fontSize: 13 },
  card: { backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 12, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  cardOverdue: { borderColor: Colors.error },
  cardSoon: { borderColor: Colors.warning },
  bannerRed: { backgroundColor: Colors.error, color: Colors.textWhite, fontSize: 12, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 6 },
  bannerYellow: { backgroundColor: Colors.warning, color: Colors.textWhite, fontSize: 12, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 6 },
  body: { padding: 16, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  muted: { fontSize: 12, color: Colors.textMuted },
  amount: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  toggleText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  items: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemAmt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  notes: { fontSize: 12, fontStyle: 'italic', color: Colors.textSecondary, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  payBox: { gap: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 12 },
  fee: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});
