import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, Image, Linking, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import SignaturePad from '@/components/SignaturePad';
import LoadingState from '@/components/LoadingState';
import {
  toSnake, num, fmtDate, errMsg, finStyles as f,
  StatusBadge, ErrorState, Section, InfoRow, ActionButton, FormSheet, Field,
} from '@/components/FinUI';

interface Contract {
  id: string;
  contract_number?: string;
  contract_type?: string;
  title?: string;
  description?: string;
  notes?: string;
  status: string;
  body?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  owner_name?: string;
  owner_email?: string;
  sent_date?: string;
  viewed_at?: string | null;
  signer_name?: string;
  signed_date?: string;
  signature_data?: string;
  owner_signer_name?: string;
  owner_signed_date?: string;
  owner_signature_data?: string;
}

const wrapHtml = (body: string) =>
  `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">${body}</body></html>`;

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [signVisible, setSignVisible] = useState(false);
  const [nameVisible, setNameVisible] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', notes: '', client_name: '', client_email: '' });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const data = await apiRequest(`/contracts/${id}`);
      if (!data) throw new Error('Contract not found');
      setContract(toSnake<Contract>(data));
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load contract'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const html = useMemo(() => (contract?.body ? wrapHtml(contract.body) : ''), [contract?.body]);

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

  if (loading) return <><Stack.Screen options={{ title: 'Contract' }} /><LoadingState message="Loading contract..." /></>;
  if (error || !contract) {
    return (
      <>
        <Stack.Screen options={{ title: 'Contract' }} />
        <ErrorState message={error || 'Contract not found'} onRetry={load} />
      </>
    );
  }

  const c = contract;
  const status = c.status;
  const ownerSigned = !!c.owner_signature_data;
  const canSend = status === 'draft';
  const canCounterSign = status === 'signed' && !ownerSigned;
  const canEdit = !['signed', 'voided'].includes(status);
  const canVoid = !['signed', 'voided'].includes(status);

  const send = () =>
    Alert.alert('Send to Client', 'The client will be notified by email/SMS with a link to review and sign this contract.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: () => run('send', async () => {
          await apiRequest(`/contracts/${id}/send`, { method: 'POST' });
          await load();
          Alert.alert('Sent', 'Contract sent to the client.');
        }, 'Failed to send contract'),
      },
    ]);

  const voidContract = () =>
    Alert.alert('Void Contract', 'This cancels the contract so it can no longer be signed. Continue?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Void', style: 'destructive',
        onPress: () => run('void', async () => {
          await apiRequest(`/contracts/${id}/void`, { method: 'POST' });
          await load();
        }, 'Failed to void contract'),
      },
    ]);

  const beginCounterSign = () => {
    setSignerName(c.owner_name || '');
    setNameVisible(true);
  };

  const proceedToSignature = () => {
    if (!signerName.trim()) { Alert.alert('Validation', 'Enter your full name.'); return; }
    setNameVisible(false);
    // Wait for the first modal to finish dismissing before presenting the next (iOS).
    setTimeout(() => setSignVisible(true), 400);
  };

  const saveSignature = (dataUrl: string) => {
    setSignVisible(false);
    run('sign', async () => {
      await apiRequest(`/contracts/${id}/owner-sign`, {
        method: 'POST',
        body: { signatureData: dataUrl, signerName: signerName.trim() },
      });
      await load();
    }, 'Failed to save signature');
  };

  const openEdit = () => {
    setForm({
      title: c.title || '', description: c.description || '', notes: c.notes || '',
      client_name: c.client_name || '', client_email: c.client_email || '',
    });
    setEditVisible(true);
  };

  const saveEdit = () => {
    if (!form.title.trim()) { Alert.alert('Validation', 'Title is required.'); return; }
    run('edit', async () => {
      await apiRequest(`/contracts/${id}`, { method: 'PATCH', body: { ...form, title: form.title.trim() } });
      setEditVisible(false);
      await load();
    }, 'Failed to save changes');
  };

  const openFile = () => {
    if (c.file_url) Linking.openURL(c.file_url).catch(() => Alert.alert('Error', 'Could not open the document.'));
  };

  return (
    <>
      <Stack.Screen options={{ title: c.contract_number || 'Contract' }} />
      <ScrollView style={f.container} contentContainerStyle={f.content}>
        <View style={f.headerCard}>
          <View style={f.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={f.headerNum}>{c.contract_number ? `Contract #${c.contract_number}` : 'Contract'}</Text>
              <Text style={f.headerName}>{c.title || 'Untitled contract'}</Text>
              {!!c.description && <Text style={f.headerSub}>{c.description}</Text>}
            </View>
            <StatusBadge status={status} />
          </View>
          {!!c.viewed_at && status === 'sent' && <Text style={f.progressText}>Viewed by client {fmtDate(c.viewed_at)}</Text>}
        </View>

        <View style={f.actionRow}>
          {canSend && <ActionButton icon="send-outline" label="Send to Client" onPress={send} loading={busy === 'send'} disabled={!!busy} />}
          {canCounterSign && (
            <ActionButton icon="create-outline" label="Counter-Sign" tone="success" onPress={beginCounterSign} loading={busy === 'sign'} disabled={!!busy} />
          )}
          {canEdit && <ActionButton icon="pencil-outline" label="Edit Details" tone="neutral" onPress={openEdit} disabled={!!busy} />}
          {canVoid && <ActionButton icon="ban-outline" label="Void" tone="danger" onPress={voidContract} loading={busy === 'void'} disabled={!!busy} />}
        </View>
        {status === 'sent' && !c.signed_date && (
          <Text style={[f.lineMeta, { marginTop: -8, marginBottom: 16 }]}>Waiting for the client to sign. You can counter-sign once they have.</Text>
        )}

        <Section title="Details">
          <InfoRow label="Client" value={c.client_name || '—'} />
          {!!c.client_email && <InfoRow label="Email" value={c.client_email} />}
          {!!c.client_phone && <InfoRow label="Phone" value={c.client_phone} />}
          {!!c.sent_date && <InfoRow label="Sent" value={fmtDate(c.sent_date, true)} />}
          <InfoRow label="Type" value={c.contract_type ? c.contract_type.replace(/_/g, ' ') : '—'} last />
        </Section>

        {!!c.notes && <Section title="Internal Notes"><Text style={f.bodyText}>{c.notes}</Text></Section>}

        {!!c.body ? (
          <View style={styles.bodyCard}>
            <WebView source={{ html }} style={styles.webview} scrollEnabled originWhitelist={['*']} />
          </View>
        ) : !!c.file_url ? (
          <Section title="Contract Document">
            <InfoRow label="File" value={c.file_name || 'Contract Document'} last={!c.file_size} />
            {num(c.file_size) > 0 && <InfoRow label="Size" value={`${(num(c.file_size) / 1024 / 1024).toFixed(2)} MB`} last />}
            <View style={{ marginTop: 12 }}>
              <ActionButton icon="download-outline" label="Open Document" onPress={openFile} />
            </View>
          </Section>
        ) : (
          <Section title="Contract Document">
            <Text style={f.bodyText}>No document attached to this contract.</Text>
          </Section>
        )}

        {status === 'signed' && !!c.signature_data && (
          <Section title="Signatures">
            <Text style={styles.sigLabel}>Client</Text>
            <Image source={{ uri: c.signature_data }} style={styles.sigImage} resizeMode="contain" />
            <Text style={f.lineMeta}>{c.signer_name || 'Client'}{c.signed_date ? ` · ${fmtDate(c.signed_date)}` : ''}</Text>
            <Text style={[styles.sigLabel, { marginTop: 16 }]}>Venue owner</Text>
            {ownerSigned ? (
              <>
                <Image source={{ uri: c.owner_signature_data }} style={styles.sigImage} resizeMode="contain" />
                <Text style={f.lineMeta}>{c.owner_signer_name || 'Owner'}{c.owner_signed_date ? ` · ${fmtDate(c.owner_signed_date)}` : ''}</Text>
              </>
            ) : (
              <Text style={f.lineMeta}>Your counter-signature is pending.</Text>
            )}
          </Section>
        )}
      </ScrollView>

      <FormSheet
        visible={nameVisible}
        title="Counter-sign contract"
        onClose={() => setNameVisible(false)}
        onSubmit={proceedToSignature}
        submitLabel="Continue to signature"
      >
        <Text style={f.bodyText}>Confirm the name that will appear next to your signature.</Text>
        <Field label="Your full name" value={signerName} onChangeText={setSignerName} autoCapitalize="words" />
      </FormSheet>

      <FormSheet
        visible={editVisible}
        title="Edit contract details"
        onClose={() => setEditVisible(false)}
        onSubmit={saveEdit}
        submitLabel="Save"
        submitting={busy === 'edit'}
      >
        <Field label="Title" value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} />
        <Field label="Description" value={form.description} onChangeText={t => setForm(p => ({ ...p, description: t }))} />
        <Field label="Internal notes" value={form.notes} onChangeText={t => setForm(p => ({ ...p, notes: t }))} multiline />
        <Field label="Client name" value={form.client_name} onChangeText={t => setForm(p => ({ ...p, client_name: t }))} />
        <Field label="Client email" value={form.client_email} onChangeText={t => setForm(p => ({ ...p, client_email: t }))} keyboardType="email-address" autoCapitalize="none" />
      </FormSheet>

      <SignaturePad visible={signVisible} onClose={() => setSignVisible(false)} onSave={saveSignature} />
    </>
  );
}

const styles = StyleSheet.create({
  bodyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', height: 480, marginBottom: 20, ...Shadow.sm,
  },
  webview: { flex: 1, backgroundColor: Colors.surface },
  sigLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sigImage: { width: '100%', height: 110, backgroundColor: Colors.background, borderRadius: Radius.md },
});
