import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, Linking, AppState } from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import {
  FRONTEND_URL, toSnake, num, fmtMoney, fmtDate, isPastDue, errMsg, finStyles as f,
  StatusBadge, ErrorState, Section, InfoRow, ActionButton,
} from '@/components/FinUI';

interface Item {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface VendorInvoice {
  id: string;
  invoice_number?: string;
  status: string;
  issue_date?: string;
  due_date?: string;
  client_name?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  amount_due?: number;
  amount_paid?: number;
  notes?: string;
  terms?: string;
  public_token?: string;
  vendor_invoice_items?: Item[];
  items?: Item[];
  vendor_accounts?: { business_name?: string; email?: string; phone?: string; city?: string; state?: string } | null;
  vendor_bookings?: { event_name?: string; event_date?: string; status?: string } | null;
}

export default function VendorInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<VendorInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const awaitingPay = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest(`/vendor-invoices/owner/${id}`);
      setInvoice(toSnake<VendorInvoice>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load invoice'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Asks the backend what Stripe actually recorded (same fallback the web uses
  // when returning from checkout) and refreshes the invoice. No card data here.
  const verifyPayment = useCallback(async (silent: boolean) => {
    const token = invoice?.public_token;
    if (!token) return;
    setChecking(true);
    try {
      const r = await apiRequest<{ status?: string; paid?: boolean }>(`/vendor-invoices/public/${token}/verify-payment`, { method: 'POST' });
      await load();
      if (!silent) {
        Alert.alert(
          r?.paid ? 'Payment received' : r?.status === 'processing' ? 'Payment processing' : 'No payment yet',
          r?.paid
            ? 'This invoice is marked as paid.'
            : r?.status === 'processing'
              ? 'Your bank payment was submitted and can take a few business days to clear.'
              : 'We have not received confirmation of a payment yet.',
        );
      }
    } catch (err: any) {
      if (!silent) Alert.alert('Error', errMsg(err, 'Could not check the payment status'));
    } finally {
      setChecking(false);
    }
  }, [invoice?.public_token, load]);

  // Returning to the app after the hosted checkout: confirm the payment automatically.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && awaitingPay.current) {
        awaitingPay.current = false;
        verifyPayment(false);
      }
    });
    return () => sub.remove();
  }, [verifyPayment]);

  if (loading) return <><Stack.Screen options={{ title: 'Invoice' }} /><LoadingState message="Loading invoice..." /></>;
  if (error || !invoice) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <ErrorState message={error || 'Invoice not found'} onRetry={load} />
      </>
    );
  }

  const inv = invoice;
  const status = inv.status;
  const total = num(inv.total_amount);
  const paid = num(inv.amount_paid);
  const due = num(inv.amount_due);
  const vendorName = inv.vendor_accounts?.business_name || inv.client_name || 'Vendor';
  const items = inv.vendor_invoice_items || inv.items || [];
  const canPay = !['paid', 'cancelled', 'processing', 'draft'].includes(status) && !!inv.public_token;
  const late = !['paid', 'cancelled'].includes(status) && isPastDue(inv.due_date);

  const payNow = () => {
    awaitingPay.current = true;
    Linking.openURL(`${FRONTEND_URL}/pay/${inv.public_token}`).catch(() => {
      awaitingPay.current = false;
      Alert.alert('Error', 'Could not open the payment page.');
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: vendorName }} />
      <ScrollView style={f.container} contentContainerStyle={f.content}>
        <View style={f.headerCard}>
          <View style={f.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={f.headerNum}>{inv.invoice_number || 'Vendor invoice'}</Text>
              <Text style={f.headerName}>{vendorName}</Text>
              {!!inv.vendor_bookings?.event_name && <Text style={f.headerSub}>{inv.vendor_bookings.event_name}</Text>}
            </View>
            <StatusBadge status={status} label={['sent', 'viewed'].includes(status) ? 'Awaiting Payment' : undefined} />
          </View>
          <Text style={f.headerAmount}>{fmtMoney(total)}</Text>
          {paid > 0 && total > 0 && status !== 'paid' && (
            <>
              <View style={f.progressBg}>
                <View style={[f.progressFill, { width: `${Math.min(100, (paid / total) * 100)}%` as any }]} />
              </View>
              <Text style={f.progressText}>{fmtMoney(paid)} paid · {fmtMoney(due)} due</Text>
            </>
          )}
        </View>

        <View style={f.actionRow}>
          {canPay && <ActionButton icon="card-outline" label="Pay Now" tone="success" onPress={payNow} />}
          {!['paid', 'cancelled', 'draft'].includes(status) && !!inv.public_token && (
            <ActionButton icon="refresh-outline" label="Check Payment" tone="neutral" onPress={() => verifyPayment(false)} loading={checking} />
          )}
          {!!inv.vendor_accounts?.phone && (
            <ActionButton icon="call-outline" label="Call Vendor" tone="neutral" onPress={() => Linking.openURL(`tel:${inv.vendor_accounts!.phone}`)} />
          )}
        </View>
        {canPay && (
          <Text style={[f.lineMeta, { marginTop: -8, marginBottom: 16 }]}>
            Pay Now opens the secure Stripe checkout page. A processing fee is added at checkout and a platform fee is deducted from the vendor's payout.
          </Text>
        )}

        {!!inv.vendor_accounts && (
          <Section title="Vendor">
            <InfoRow label="Business" value={vendorName} />
            {!!inv.vendor_accounts.email && <InfoRow label="Email" value={inv.vendor_accounts.email} />}
            {!!inv.vendor_accounts.phone && <InfoRow label="Phone" value={inv.vendor_accounts.phone} />}
            {(!!inv.vendor_accounts.city || !!inv.vendor_accounts.state) && (
              <InfoRow label="Location" value={[inv.vendor_accounts.city, inv.vendor_accounts.state].filter(Boolean).join(', ')} last />
            )}
          </Section>
        )}

        <Section title="Details">
          <InfoRow label="Issued" value={fmtDate(inv.issue_date, true)} />
          <InfoRow label="Due" value={fmtDate(inv.due_date, true) + (late ? ' (past due)' : '')} valueColor={late ? Colors.error : undefined}
            last={!inv.vendor_bookings?.event_date} />
          {!!inv.vendor_bookings?.event_date && <InfoRow label="Event date" value={fmtDate(inv.vendor_bookings.event_date, true)} last />}
        </Section>

        {items.length > 0 && (
          <Section title="Line Items">
            {items.map((item, idx) => (
              <View key={item.id} style={[f.lineRow, idx < items.length - 1 && f.lineBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={f.lineDesc}>{item.description}</Text>
                  <Text style={f.lineMeta}>{num(item.quantity)} × {fmtMoney(item.unit_price)}</Text>
                </View>
                <Text style={f.lineAmt}>{fmtMoney(item.amount)}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Totals">
          <InfoRow label="Subtotal" value={fmtMoney(inv.subtotal)} />
          {num(inv.discount_amount) > 0 && <InfoRow label="Discount" value={`−${fmtMoney(inv.discount_amount)}`} valueColor={Colors.error} />}
          {num(inv.tax_amount) > 0 && <InfoRow label={`Tax (${num(inv.tax_rate)}%)`} value={fmtMoney(inv.tax_amount)} />}
          <InfoRow label="Total" value={fmtMoney(total)} bold last={paid === 0} />
          {paid > 0 && <InfoRow label="Paid" value={`−${fmtMoney(paid)}`} valueColor={Colors.success} />}
          {paid > 0 && <InfoRow label="Balance Due" value={fmtMoney(due)} bold valueColor={due > 0 ? Colors.error : Colors.success} last />}
        </Section>

        {!!inv.notes && <Section title="Notes"><Text style={f.bodyText}>{inv.notes}</Text></Section>}
        {!!inv.terms && <Section title="Terms"><Text style={f.bodyText}>{inv.terms}</Text></Section>}
      </ScrollView>
    </>
  );
}
