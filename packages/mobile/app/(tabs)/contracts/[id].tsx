import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import SignaturePad from '@/components/SignaturePad';

interface Contract {
  id: string;
  contract_number?: string;
  title?: string;
  status: 'draft' | 'sent' | 'signed' | 'voided';
  body?: string;
  client_name?: string;
  client_email?: string;
  signer_name?: string;
  signed_date?: string;
  owner_signer_name?: string;
  owner_signed_date?: string;
}

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signVisible, setSignVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<Contract>(`/contracts/${id}`);
      setContract(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSend = async () => {
    try {
      setBusy(true);
      await apiRequest(`/contracts/${id}/send`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send contract');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSignature = async (signatureDataUrl: string) => {
    setSignVisible(false);
    try {
      setBusy(true);
      await apiRequest(`/contracts/${id}/owner-sign`, {
        method: 'POST',
        body: { signatureData: signatureDataUrl, signerName: contract?.client_name ? 'Venue Owner' : 'Venue Owner' },
      });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save signature');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
    );
  }

  if (error || !contract) {
    return (
      <View style={styles.center}><Text style={styles.errorText}>{error || 'Contract not found'}</Text></View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.title}>{contract.title || contract.contract_number || 'Contract'}</Text>
        <Text style={styles.status}>Status: {contract.status}</Text>
        {!!contract.client_name && <Text style={styles.row}>Client: {contract.client_name}</Text>}
        {!!contract.signer_name && (
          <Text style={styles.row}>
            Signed by {contract.signer_name}{contract.signed_date ? ` on ${new Date(contract.signed_date).toLocaleDateString()}` : ''}
          </Text>
        )}
        {!!contract.owner_signer_name && (
          <Text style={styles.row}>
            Countersigned by {contract.owner_signer_name}{contract.owner_signed_date ? ` on ${new Date(contract.owner_signed_date).toLocaleDateString()}` : ''}
          </Text>
        )}
      </View>

      {contract.status === 'draft' && (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSend} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? 'Sending…' : 'Send to Client'}</Text>
        </TouchableOpacity>
      )}

      {contract.status !== 'draft' && !contract.owner_signer_name && (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setSignVisible(true)} disabled={busy}>
          <Text style={styles.primaryBtnText}>Countersign as Owner</Text>
        </TouchableOpacity>
      )}

      <SignaturePad
        visible={signVisible}
        onClose={() => setSignVisible(false)}
        onSave={handleSaveSignature}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: Radius.md, padding: 16, gap: 6 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  status: { fontSize: 14, color: Colors.textSecondary, textTransform: 'capitalize' },
  row: { fontSize: 14, color: Colors.textSecondary },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
