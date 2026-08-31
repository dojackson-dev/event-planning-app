import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import SignaturePad from '@/components/SignaturePad';

interface Contract {
  id: string;
  contract_number?: string;
  title?: string;
  status: 'draft' | 'sent' | 'signed' | 'voided';
  owner_name?: string;
  signer_name?: string;
  signed_date?: string;
}

export default function VendorContractDetailScreen() {
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

  const handleSaveSignature = async (signatureDataUrl: string) => {
    setSignVisible(false);
    try {
      setBusy(true);
      await apiRequest(`/contracts/${id}/vendor-sign`, {
        method: 'POST',
        body: { signatureData: signatureDataUrl, signerName: contract?.owner_name ? 'Vendor' : 'Vendor' },
      });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save signature');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  if (error || !contract) {
    return <View style={styles.center}><Text style={styles.errorText}>{error || 'Contract not found'}</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.title}>{contract.title || contract.contract_number || 'Contract'}</Text>
        <Text style={styles.status}>Status: {contract.status}</Text>
        {!!contract.signer_name && (
          <Text style={styles.row}>
            Signed by {contract.signer_name}{contract.signed_date ? ` on ${new Date(contract.signed_date).toLocaleDateString()}` : ''}
          </Text>
        )}
      </View>

      {contract.status !== 'draft' && !contract.signer_name && (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setSignVisible(true)} disabled={busy}>
          <Text style={styles.primaryBtnText}>Sign Contract</Text>
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
