import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, Share, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import {
  FRONTEND_URL, toSnake, num, fmtMoney, fmtDate, errMsg, finStyles as f,
  StatusBadge, ErrorState, Section, InfoRow, ActionButton, FormSheet, Field,
} from '@/components/FinUI';

interface Item {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  item_type?: 'revenue' | 'expense';
}

interface InvoiceDetail {
  id: string;
  invoice_number?: string;
  status: string;
  total_amount?: number;
  amount_due?: number;
  amount_paid?: number;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  issue_date?: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  terms?: string;
  public_token?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  deposit_percentage?: number;
  deposit_due_days_before?: number;
  final_payment_due_days_before?: number;
  event?: { name?: string; date?: string } | null;
  booking?: { contact_name?: string; contact_email?: string; contact_phone?: string } | null;
  intake_form?: { contact_name?: string; contact_email?: string; contact_phone?: string } | null;
  items?: Item[];
}

const OPEN = ['sent', 'viewed', 'partial', 'overdue'];

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [payVisible, setPayVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest(`/invoices/${id}`);
      setInvoice(toSnake<InvoiceDetail>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load invoice'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (key: string, fn: () => Promise<void>, failMsg: string) => {
    setBusy(key);
    try {
      await fn();
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, failMsg));
    } finally {
      setBusy(null);
    }
  };

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
  const form = inv.intake_form;
  const booking = inv.booking;
  const clientName = inv.client_name || booking?.contact_name || form?.contact_name || inv.client_email || '';
  const clientEmail = inv.client_email || booking?.contact_email || form?.contact_email || '';
  const clientPhone = inv.client_phone || booking?.contact_phone || form?.contact_phone || '';
  const invNum = inv.invoice_number || `INV-${inv.id.slice(-6).toUpperCase()}`;

  const items = inv.items || [];
  const revenue = items.filter(i => !i.item_type || i.item_type === 'revenue');
  const expenses = items.filter(i => i.item_type === 'expense');
  const vendorCosts = expenses.reduce((sum, i) => sum + num(i.amount), 0);
  const itemDiscounts = revenue.reduce((sum, i) => sum + num(i.discount_amount), 0);
  const extraDiscount = num(inv.discount_amount);

  const isOpen = OPEN.includes(status);
  const canEdit = ['draft', 'sent', 'overdue', 'partial'].includes(status);
  const canCancel = ['sent', 'overdue'].includes(status) && paid === 0;
  const canDelete = status === 'draft' && paid === 0;
  const canShareLink = isOpen && !!inv.public_token;
  const payUrl = inv.public_token ? `${FRONTEND_URL}/pay/invoice/${inv.public_token}` : '';

  const setStatus = (next: string) => apiRequest(`/invoices/${id}/status`, { method: 'PUT', body: { status: next } });

  const sendInvoice = () => {
    const resend = status !== 'draft';
    Alert.alert(
      resend ? 'Resend Invoice' : 'Send Invoice',
      `This notifies ${clientName || 'the client'}${clientPhone ? ` by SMS (${clientPhone})` : ' (no phone on file)'}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: resend ? 'Resend' : 'Send',
          onPress: () => run('send', async () => {
            await setStatus(resend ? status : 'sent');
            await load();
            Alert.alert('Sent', 'Invoice sent to the client.');
          }, 'Failed to send invoice'),
        },
      ],
    );
  };

  const submitPayment = () => {
    const amount = parseFloat(payAmount);
    if (!(amount > 0)) {
      Alert.alert('Validation', 'Enter a payment amount greater than 0.');
      return;
    }
    run('pay', async () => {
      await apiRequest(`/invoices/${id}/payment`, { method: 'POST', body: { amount } });
      setPayVisible(false);
      setPayAmount('');
      await load();
    }, 'Failed to record payment');
  };

  const markPaid = () => {
    Alert.alert('Mark as Paid', `Record the remaining ${fmtMoney(due)} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: () => run('paid', async () => {
          await apiRequest(`/invoices/${id}/payment`, { method: 'POST', body: { amount: due } });
          await load();
        }, 'Failed to mark invoice paid'),
      },
    ]);
  };

  const cancelInvoice = () => {
    Alert.alert('Cancel Invoice', 'It will remain in your records and can no longer be paid.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Invoice', style: 'destructive',
        onPress: () => run('cancel', async () => { await setStatus('cancelled'); await load(); }, 'Failed to cancel invoice'),
      },
    ]);
  };

  const deleteDraft = () => {
    Alert.alert('Delete Draft', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => run('delete', async () => {
          await apiRequest(`/invoices/${id}`, { method: 'DELETE' });
          router.back();
        }, 'Failed to delete invoice'),
      },
    ]);
  };

  const sharePayLink = async () => {
    try {
      await Share.share({ message: `Pay invoice ${invNum}: ${payUrl}`, url: payUrl });
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, 'Could not share the payment link'));
    }
  };

  const depositPct = num(inv.deposit_percentage);
  const eventDate = inv.event?.date ? new Date(`${inv.event.date}T00:00:00`) : null;
  const dueBefore = (days?: number) =>
    eventDate && days != null
      ? fmtDate(new Date(eventDate.getTime() - days * 86400000).toISOString().slice(0, 10))
      : days != null ? `${days} days before event` : '';

  return (
    <>
      <Stack.Screen options={{ title: invNum }} />
      <ScrollView style={f.container} contentContainerStyle={f.content}>
        <View style={f.headerCard}>
          <View style={f.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={f.headerNum}>{invNum}</Text>
              {!!clientName && <Text style={f.headerName}>{clientName}</Text>}
              {!!inv.event?.name && (
                <Text style={f.headerSub}>{inv.event.name}{inv.event.date ? ` · ${fmtDate(inv.event.date)}` : ''}</Text>
              )}
            </View>
            <StatusBadge status={status} />
          </View>
          <Text style={f.headerAmount}>{fmtMoney(total)}</Text>
          {paid > 0 && total > 0 && (
            <>
              <View style={f.progressBg}>
                <View style={[f.progressFill, { width: `${Math.min(100, (paid / total) * 100)}%` as any }]} />
              </View>
              <Text style={f.progressText}>{fmtMoney(paid)} paid · {fmtMoney(due)} due</Text>
            </>
          )}
        </View>

        <View style={f.actionRow}>
          {status === 'draft' && (
            <ActionButton icon="send-outline" label="Send Invoice" onPress={sendInvoice} loading={busy === 'send'} disabled={!!busy} />
          )}
          {['sent', 'partial', 'overdue'].includes(status) && (
            <ActionButton icon="refresh-outline" label="Resend" onPress={sendInvoice} loading={busy === 'send'} disabled={!!busy} />
          )}
          {isOpen && due > 0 && (
            <ActionButton icon="cash-outline" label="Record Payment" tone="success"
              onPress={() => { setPayAmount(due.toFixed(2)); setPayVisible(true); }} disabled={!!busy} />
          )}
          {isOpen && due > 0 && (
            <ActionButton icon="checkmark-circle-outline" label="Mark Paid" tone="success"
              onPress={markPaid} loading={busy === 'paid'} disabled={!!busy} />
          )}
          {canShareLink && (
            <ActionButton icon="share-outline" label="Share Pay Link" onPress={sharePayLink} disabled={!!busy} />
          )}
          {canEdit && (
            <ActionButton icon="create-outline" label="Edit" tone="neutral"
              onPress={() => router.push({ pathname: '/(tabs)/invoices/edit', params: { id } } as any)} disabled={!!busy} />
          )}
          {!!clientPhone && (
            <ActionButton icon="call-outline" label="Call Client" tone="neutral"
              onPress={() => Linking.openURL(`tel:${clientPhone}`)} disabled={!!busy} />
          )}
          {canCancel && (
            <ActionButton icon="close-circle-outline" label="Cancel Invoice" tone="danger"
              onPress={cancelInvoice} loading={busy === 'cancel'} disabled={!!busy} />
          )}
          {canDelete && (
            <ActionButton icon="trash-outline" label="Delete Draft" tone="danger"
              onPress={deleteDraft} loading={busy === 'delete'} disabled={!!busy} />
          )}
        </View>

        <Section title="Client">
          <InfoRow label="Name" value={clientName || '—'} />
          {!!clientEmail && <InfoRow label="Email" value={clientEmail} />}
          <InfoRow label="Phone" value={clientPhone || '—'} last />
        </Section>

        <Section title="Dates">
          <InfoRow label="Issue Date" value={fmtDate(inv.issue_date, true)} />
          <InfoRow label="Due Date" value={fmtDate(inv.due_date, true)} last={!inv.paid_date} />
          {!!inv.paid_date && <InfoRow label="Paid" value={fmtDate(inv.paid_date, true)} last />}
        </Section>

        {revenue.length > 0 && (
          <Section title="Line Items">
            {revenue.map((item, idx) => (
              <View key={item.id} style={[f.lineRow, idx < revenue.length - 1 && f.lineBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={f.lineDesc}>{item.description}</Text>
                  <Text style={f.lineMeta}>
                    {num(item.quantity)} × {fmtMoney(item.unit_price)}
                    {num(item.discount_amount) > 0 ? ` · −${fmtMoney(item.discount_amount)} discount` : ''}
                  </Text>
                </View>
                <Text style={f.lineAmt}>{fmtMoney(item.amount)}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Totals">
          <InfoRow label="Subtotal" value={fmtMoney(inv.subtotal)} />
          {num(inv.tax_rate) > 0 && <InfoRow label={`Tax (${num(inv.tax_rate)}%)`} value={fmtMoney(inv.tax_amount)} />}
          {itemDiscounts > 0 && <InfoRow label="Item discounts" value={`−${fmtMoney(itemDiscounts)}`} valueColor={Colors.error} />}
          {extraDiscount > 0 && <InfoRow label="Additional discount" value={`−${fmtMoney(extraDiscount)}`} valueColor={Colors.error} />}
          <InfoRow label="Total" value={fmtMoney(total)} bold last={paid === 0} />
          {paid > 0 && <InfoRow label="Paid" value={`−${fmtMoney(paid)}`} valueColor={Colors.success} />}
          {paid > 0 && <InfoRow label="Balance Due" value={fmtMoney(due)} bold valueColor={due > 0 ? Colors.error : Colors.success} last />}
        </Section>

        {depositPct > 0 && (
          <Section title="Payment Schedule">
            <InfoRow
              label={`Deposit (${depositPct}%)${inv.deposit_due_days_before != null ? ` · due ${dueBefore(inv.deposit_due_days_before)}` : ''}`}
              value={fmtMoney((total * depositPct) / 100)}
            />
            <InfoRow
              label={`Final payment${inv.final_payment_due_days_before != null ? ` · due ${dueBefore(inv.final_payment_due_days_before)}` : ''}`}
              value={fmtMoney(total - (total * depositPct) / 100)}
              last
            />
          </Section>
        )}

        {expenses.length > 0 && (
          <Section title="Vendor Costs (internal)">
            {expenses.map((item, idx) => (
              <View key={item.id} style={[f.lineRow, f.lineBorder, idx === expenses.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={f.lineDesc}>{item.description}</Text>
                  <Text style={f.lineMeta}>{num(item.quantity)} × {fmtMoney(item.unit_price)}</Text>
                </View>
                <Text style={[f.lineAmt, { color: Colors.warningText }]}>{fmtMoney(item.amount)}</Text>
              </View>
            ))}
            <InfoRow label="Total vendor costs" value={`−${fmtMoney(vendorCosts)}`} valueColor={Colors.warningText} />
            <InfoRow
              label="Estimated margin"
              value={fmtMoney(total - vendorCosts)}
              valueColor={total - vendorCosts >= 0 ? Colors.successText : Colors.error}
              bold last
            />
          </Section>
        )}

        {!!inv.notes && <Section title="Notes"><Text style={f.bodyText}>{inv.notes}</Text></Section>}
        {!!inv.terms && <Section title="Terms"><Text style={f.bodyText}>{inv.terms}</Text></Section>}
      </ScrollView>

      <FormSheet
        visible={payVisible}
        title="Record Payment"
        onClose={() => setPayVisible(false)}
        onSubmit={submitPayment}
        submitLabel="Record Payment"
        submitting={busy === 'pay'}
      >
        <Text style={f.bodyText}>
          Log a payment you received outside the app (cash, check, bank transfer). Balance due: {fmtMoney(due)}.
        </Text>
        <Field label="Amount (USD)" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" placeholder="0.00" />
      </FormSheet>
    </>
  );
}
