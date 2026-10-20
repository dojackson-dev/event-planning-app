import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import { CONTRACT_STATUS } from '@/components/netContractStatus';
import { fmtDate, titleCase } from '@/components/netFormat';

interface ContractDetail {
  id: string;
  contract_number: string;
  title: string;
  status: string;
  contract_type: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  sent_date: string | null;
  signed_date: string | null;
  signer_name: string | null;
  viewed_at: string | null;
  created_at: string;
}

// Mirrors web dashboard/promoter/contracts/[id]: view, send (POST /contracts/:id/send), cancel (PATCH).
export default function PromoterContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setContract(await apiRequest<ContractDetail>(`/contracts/${id}`));
    } catch (err: any) {
      setError(err?.message || 'Failed to load contract.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async () => {
    setBusy(true);
    try {
      setContract(await apiRequest<ContractDetail>(`/contracts/${id}/send`, { method: 'POST' }));
      Alert.alert('Sent', 'Contract sent to the artist via email and SMS.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send contract.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () =>
    Alert.alert('Cancel contract?', 'The recipient will no longer be able to sign it.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Contract',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            setContract(await apiRequest<ContractDetail>(`/contracts/${id}`, { method: 'PATCH', body: { status: 'cancelled' } }));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to cancel contract.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  if (loading) return <LoadingState message="Loading contract..." />;
  if (error || !contract) return <EmptyState icon="alert-circle-outline" title="Couldn't load contract" message={error || 'Contract not found.'} />;

  const st = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.draft;
  const row = (label: string, value?: string | null) =>
    value ? (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    ) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.sm]}>
        <View style={styles.top}>
          <Text style={styles.title}>{contract.title}</Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text></View>
        </View>
        {row('Number', contract.contract_number)}
        {row('Type', titleCase(contract.contract_type))}
        {row('Client', contract.client_name)}
        {row('Email', contract.client_email)}
        {row('Phone', contract.client_phone)}
        {row('Created', fmtDate(contract.created_at))}
        {row('Sent', fmtDate(contract.sent_date))}
        {row('Viewed', fmtDate(contract.viewed_at))}
        {row('Signed', contract.signed_date ? `${fmtDate(contract.signed_date)}${contract.signer_name ? ` by ${contract.signer_name}` : ''}` : null)}
      </View>

      {!!contract.notes && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Notes</Text>
          <Text style={styles.body}>{contract.notes}</Text>
        </View>
      )}

      {!!contract.body && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Contract</Text>
          <Text style={styles.body}>{contract.body}</Text>
        </View>
      )}

      {!!contract.file_url && (
        <AppButton title={`Open ${contract.file_name || 'attached file'}`} variant="secondary" onPress={() => Linking.openURL(contract.file_url!)} style={styles.gap} />
      )}

      {(contract.status === 'draft' || contract.status === 'sent') && (
        <AppButton title={contract.status === 'sent' ? 'Resend to Artist' : 'Send to Artist'} onPress={send} loading={busy} style={{ ...styles.gap, backgroundColor: Colors.purple }} />
      )}
      {contract.status !== 'cancelled' && contract.status !== 'signed' && (
        <AppButton title="Cancel Contract" variant="outline" onPress={cancel} disabled={busy} style={{ borderColor: Colors.error }} textStyle={{ color: Colors.error }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 13, color: Colors.textMuted },
  value: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  heading: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textTransform: 'uppercase' },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  gap: { marginBottom: 10 },
});
