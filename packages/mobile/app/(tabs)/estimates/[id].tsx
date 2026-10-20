import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import {
  toSnake, num, fmtMoney, fmtDate, isPastDue, errMsg, finStyles as f,
  StatusBadge, ErrorState, Section, InfoRow, ActionButton,
} from '@/components/FinUI';

interface Item {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  discount_amount?: number;
}

interface Estimate {
  id: string;
  estimate_number?: string;
  status: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  issue_date?: string;
  expiration_date?: string;
  viewed_at?: string | null;
  converted_invoice_id?: string | null;
  notes?: string;
  terms?: string;
  owner_business_name?: string;
  intake_form?: { contact_name?: string; contact_phone?: string; contact_email?: string; event_name?: string } | null;
  items?: Item[];
}

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest(`/estimates/${id}`);
      const est = toSnake<Estimate & { estimate_items?: Item[] }>(data);
      if (!est.items && est.estimate_items) est.items = est.estimate_items;
      setEstimate(est);
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load estimate'));
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

  if (loading) return <><Stack.Screen options={{ title: 'Estimate' }} /><LoadingState message="Loading estimate..." /></>;
  if (error || !estimate) {
    return (
      <>
        <Stack.Screen options={{ title: 'Estimate' }} />
        <ErrorState message={error || 'Estimate not found'} onRetry={load} />
      </>
    );
  }

  const est = estimate;
  const st = est.status;
  const form = est.intake_form;
  const clientName = est.client_name || form?.contact_name || form?.event_name || 'Client';
  const clientPhone = est.client_phone || form?.contact_phone || '';
  const clientEmail = est.client_email || form?.contact_email || '';
  const number = est.estimate_number || `EST-${est.id.slice(-6).toUpperCase()}`;
  const items = est.items || [];
  const expired = st === 'sent' && isPastDue(est.expiration_date);
  const canConvert = ['draft', 'sent', 'approved'].includes(st);

  const setStatus = (next: string, doneMsg?: string) =>
    run(`status-${next}`, async () => {
      await apiRequest(`/estimates/${id}/status`, { method: 'PUT', body: { status: next } });
      await load();
      if (doneMsg) Alert.alert('Done', doneMsg);
    }, 'Failed to update estimate');

  const confirmStatus = (title: string, body: string, next: string, doneMsg?: string, destructive = false) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: destructive ? 'destructive' : 'default', onPress: () => setStatus(next, doneMsg) },
    ]);

  const convert = () =>
    Alert.alert('Create Invoice', 'Convert this estimate to an invoice? The estimate will be marked as converted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert',
        onPress: () => run('convert', async () => {
          const inv = await apiRequest<{ id: string; invoice_number?: string }>(`/estimates/${id}/convert-to-invoice`, { method: 'POST' });
          Alert.alert('Invoice created', inv.invoice_number ? `Invoice ${inv.invoice_number} was created.` : 'Invoice created.', [
            { text: 'View Invoice', onPress: () => router.replace(`/(tabs)/invoices/${inv.id}` as any) },
            { text: 'Stay Here' },
          ]);
          await load();
        }, 'Failed to convert to invoice'),
      },
    ]);

  const remove = () =>
    Alert.alert('Delete Estimate', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => run('delete', async () => {
          await apiRequest(`/estimates/${id}`, { method: 'DELETE' });
          router.back();
        }, 'Failed to delete estimate'),
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: number }} />
      <ScrollView style={f.container} contentContainerStyle={f.content}>
        <View style={f.headerCard}>
          <View style={f.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={f.headerNum}>{number}</Text>
              <Text style={f.headerName}>{clientName}</Text>
              {!!est.owner_business_name && <Text style={f.headerSub}>From {est.owner_business_name}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={st} />
              {!!est.viewed_at && <StatusBadge status="approved" label="Viewed" />}
            </View>
          </View>
          <Text style={f.headerAmount}>{fmtMoney(est.total_amount)}</Text>
          <Text style={[f.progressText, { marginTop: 8 }, expired && { color: Colors.error, fontWeight: '600' }]}>
            Issued {fmtDate(est.issue_date)} · Expires {fmtDate(est.expiration_date)}{expired ? ' (past)' : ''}
          </Text>
        </View>

        <View style={f.actionRow}>
          {canConvert && <ActionButton icon="receipt-outline" label="Create Invoice" tone="success" onPress={convert} loading={busy === 'convert'} disabled={!!busy} />}
          {st === 'converted' && !!est.converted_invoice_id && (
            <ActionButton icon="open-outline" label="Open Invoice" tone="success"
              onPress={() => router.push(`/(tabs)/invoices/${est.converted_invoice_id}` as any)} />
          )}
          {st === 'draft' && (
            <ActionButton icon="send-outline" label="Send to Client" onPress={() =>
              confirmStatus('Send', `Send this estimate to ${clientName}${clientPhone ? ` (${clientPhone})` : ''}?`, 'sent', 'Estimate sent to the client.')}
              loading={busy === 'status-sent'} disabled={!!busy} />
          )}
          {st === 'draft' && (
            <ActionButton icon="create-outline" label="Edit" tone="neutral"
              onPress={() => router.push({ pathname: '/(tabs)/estimates/edit', params: { id } } as any)} disabled={!!busy} />
          )}
          {st === 'sent' && (
            <ActionButton icon="checkmark-circle-outline" label="Mark Approved" tone="success"
              onPress={() => confirmStatus('Mark Approved', 'Mark this estimate as approved by the client?', 'approved')}
              loading={busy === 'status-approved'} disabled={!!busy} />
          )}
          {st === 'sent' && (
            <ActionButton icon="close-circle-outline" label="Mark Rejected" tone="danger"
              onPress={() => confirmStatus('Mark Rejected', 'Mark this estimate as rejected?', 'rejected', undefined, true)}
              loading={busy === 'status-rejected'} disabled={!!busy} />
          )}
          {expired && (
            <ActionButton icon="time-outline" label="Mark Expired" tone="neutral"
              onPress={() => confirmStatus('Mark Expired', 'The client did not respond in time. Mark as expired?', 'expired')}
              loading={busy === 'status-expired'} disabled={!!busy} />
          )}
          {!!clientPhone && <ActionButton icon="call-outline" label="Call Client" tone="neutral" onPress={() => Linking.openURL(`tel:${clientPhone}`)} />}
          {st !== 'converted' && (
            <ActionButton icon="trash-outline" label="Delete" tone="danger" onPress={remove} loading={busy === 'delete'} disabled={!!busy} />
          )}
        </View>
        {st !== 'draft' && st !== 'converted' && (
          <Text style={[f.lineMeta, { marginTop: -8, marginBottom: 16 }]}>
            Sent estimates can't be edited. To change anything, create a new estimate.
          </Text>
        )}

        <Section title="Client">
          <InfoRow label="Name" value={clientName} />
          {!!clientEmail && <InfoRow label="Email" value={clientEmail} />}
          <InfoRow label="Phone" value={clientPhone || '—'} last />
        </Section>

        {items.length > 0 && (
          <Section title="Line Items">
            {items.map((item, idx) => (
              <View key={item.id} style={[f.lineRow, idx < items.length - 1 && f.lineBorder]}>
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
          <InfoRow label="Subtotal" value={fmtMoney(est.subtotal)} />
          {num(est.tax_rate) > 0 && <InfoRow label={`Tax (${num(est.tax_rate)}%)`} value={fmtMoney(est.tax_amount)} />}
          {num(est.discount_amount) > 0 && <InfoRow label="Discount" value={`−${fmtMoney(est.discount_amount)}`} valueColor={Colors.error} />}
          <InfoRow label="Total" value={fmtMoney(est.total_amount)} bold last />
        </Section>

        {!!est.notes && <Section title="Notes"><Text style={f.bodyText}>{est.notes}</Text></Section>}
        {!!est.terms && <Section title="Terms"><Text style={f.bodyText}>{est.terms}</Text></Section>}
      </ScrollView>
    </>
  );
}
