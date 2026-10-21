import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Alert, Image, TextInput, TouchableOpacity, Linking,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientApi, getClientSession } from '@/lib/clientApi';
import { Colors, Radius } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import SignaturePad from '@/components/SignaturePad';
import {
  CliDocBadge, CliDocError, CliDocCard, CONTRACT_STATUS, useCliDocLoad, useClientAuthRedirect,
  cliDocStyles, pick, htmlToText, fmtDateTime,
} from '@/components/CliDocUI';

interface Contract {
  id: string;
  status: string;
  number?: string;
  title?: string;
  description?: string;
  body: string;
  fileUrl?: string;
  fileName?: string;
  signerName?: string;
  signedDate?: string;
  signatureData?: string;
}

function normalize(c: any): Contract {
  return {
    id: String(c.id),
    status: String(c?.status ?? 'draft'),
    number: pick(c, 'contract_number'),
    title: c?.title,
    description: c?.description,
    body: htmlToText(c?.body),
    fileUrl: pick(c, 'file_url'),
    fileName: pick(c, 'file_name'),
    signerName: pick(c, 'signer_name'),
    signedDate: pick(c, 'signed_date'),
    signatureData: pick(c, 'signature_data'),
  };
}

const isSignatureData = (s: string | null) => !!s && /^data:image\/[a-z+]+;base64,/i.test(s) && s.length > 200;

export default function ClientContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const redirectOnAuth = useClientAuthRedirect();
  const [signerName, setSignerName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [padVisible, setPadVisible] = useState(false);
  const [signing, setSigning] = useState(false);
  const { data, setData, loading, refreshing, error, reload, refresh } = useCliDocLoad<Contract>(async () =>
    normalize(await clientApi(`/contracts/${id}`)),
  );

  // Lets the coordinator know the contract was opened; failures are irrelevant to the client.
  useEffect(() => {
    if (!id) return;
    clientApi(`/contracts/${id}/viewed`, { method: 'POST', body: {} }).catch(() => {});
  }, [id]);

  useEffect(() => {
    getClientSession().then((s) => {
      const name = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim();
      if (name) setSignerName((prev) => prev || name);
    });
  }, []);

  const openFile = (url: string) => {
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert('Cannot open file', 'This document link is not valid.');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Cannot open file', 'Unable to open the document.'));
  };

  const submit = async () => {
    if (!signerName.trim()) {
      Alert.alert('Name required', 'Please enter your full legal name.');
      return;
    }
    if (!isSignatureData(signature)) {
      Alert.alert('Signature required', 'Please draw your signature.');
      return;
    }
    setSigning(true);
    try {
      const res = await clientApi(`/contracts/${id}/sign`, {
        method: 'POST',
        body: { signatureData: signature, signerName: signerName.trim() },
      });
      setData(normalize(res));
      setSignature(null);
      Alert.alert('Contract signed', 'Your coordinator has been notified.');
    } catch (err: any) {
      if (redirectOnAuth(err)) return;
      Alert.alert('Could not sign contract', err?.message || 'Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <LoadingState message="Loading contract..." />;
  if (error && !data) return <CliDocError message={error} onRetry={reload} />;
  if (!data) return <CliDocError message="Contract not found." onRetry={reload} />;

  const cfg = CONTRACT_STATUS[data.status] ?? CONTRACT_STATUS.draft;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={cliDocStyles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>{data.title ?? 'Contract'}</Text>
            {data.number ? <Text style={cliDocStyles.muted}>#{data.number}</Text> : null}
            {data.description ? <Text style={styles.desc}>{data.description}</Text> : null}
          </View>
          <CliDocBadge cfg={cfg} />
        </View>

        {data.body ? (
          <View>
            <SectionHeader title="Contract Document" />
            <CliDocCard>
              <Text style={styles.docText} selectable>{data.body}</Text>
            </CliDocCard>
          </View>
        ) : data.fileUrl ? (
          <View>
            <SectionHeader title="Contract Document" />
            <CliDocCard>
              <View style={styles.fileRow}>
                <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                <Text style={styles.fileName} numberOfLines={2}>{data.fileName ?? 'Contract Document'}</Text>
              </View>
              <AppButton title="View / Download" variant="secondary" onPress={() => openFile(data.fileUrl!)} />
            </CliDocCard>
          </View>
        ) : null}

        {data.status === 'signed' && (
          <View style={styles.signedBox}>
            <View style={styles.signedHead}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.signedTitle}>Contract Signed</Text>
                <Text style={styles.signedSub}>
                  {data.signerName ? `Signed by ${data.signerName}` : 'Signed'}
                  {data.signedDate ? ` on ${fmtDateTime(data.signedDate)}` : ''}
                </Text>
              </View>
            </View>
            {data.signatureData ? (
              <View style={styles.sigWrap}>
                <Text style={cliDocStyles.muted}>Signature on file:</Text>
                <Image source={{ uri: data.signatureData }} style={styles.sigImage} resizeMode="contain" />
              </View>
            ) : null}
          </View>
        )}

        {data.status === 'voided' && (
          <View style={[styles.signedBox, { backgroundColor: Colors.warningLight, borderColor: Colors.warning }]}>
            <Text style={[styles.signedTitle, { color: Colors.warningText }]}>Contract Waived</Text>
            <Text style={[styles.signedSub, { color: Colors.warningText }]}>
              Your coordinator has waived the contract requirement. You can proceed to the next step without signing.
            </Text>
          </View>
        )}

        {data.status === 'sent' && (
          <CliDocCard style={styles.signCard}>
            <Text style={styles.signTitle}>Signature Required</Text>
            <Text style={cliDocStyles.sub}>
              Please review the document above, then sign below to confirm your agreement.
            </Text>

            <Text style={styles.label}>Your full legal name *</Text>
            <TextInput
              style={cliDocStyles.input}
              value={signerName}
              onChangeText={setSignerName}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              editable={!signing}
            />

            <Text style={styles.label}>Your signature *</Text>
            <TouchableOpacity
              style={styles.sigBox}
              onPress={() => setPadVisible(true)}
              disabled={signing}
              activeOpacity={0.8}
            >
              {signature ? (
                <Image source={{ uri: signature }} style={styles.sigPreview} resizeMode="contain" />
              ) : (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Ionicons name="create-outline" size={24} color={Colors.textMuted} />
                  <Text style={cliDocStyles.muted}>Tap to draw your signature</Text>
                </View>
              )}
            </TouchableOpacity>
            {signature ? (
              <Text style={styles.redo} onPress={() => setPadVisible(true)}>Redraw signature</Text>
            ) : null}

            <Text style={styles.legal}>
              By tapping &ldquo;Sign &amp; Submit&rdquo; you agree that your electronic signature is legally binding
              and constitutes your acceptance of all terms and conditions in this contract.
            </Text>
            <AppButton
              title="Sign & Submit"
              onPress={submit}
              loading={signing}
              disabled={!signerName.trim() || !signature}
              style={{ backgroundColor: Colors.success }}
            />
          </CliDocCard>
        )}
      </ScrollView>

      <SignaturePad
        visible={padVisible}
        onClose={() => setPadVisible(false)}
        onSave={(dataUrl) => { setSignature(dataUrl); setPadVisible(false); }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  desc: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },
  docText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  signedBox: { backgroundColor: Colors.successLight, borderWidth: 1, borderColor: Colors.success, borderRadius: Radius.lg, padding: 16, gap: 10 },
  signedHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signedTitle: { fontSize: 16, fontWeight: '700', color: Colors.successText },
  signedSub: { fontSize: 13, color: Colors.successText, marginTop: 2, lineHeight: 19 },
  sigWrap: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, gap: 6 },
  sigImage: { width: '100%', height: 90 },
  signCard: { borderWidth: 1, borderColor: Colors.info, gap: 10 },
  signTitle: { fontSize: 16, fontWeight: '700', color: Colors.infoText },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 4 },
  sigBox: {
    height: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, borderRadius: Radius.md,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  sigPreview: { width: '100%', height: '100%' },
  redo: { fontSize: 13, color: Colors.primary, fontWeight: '600', alignSelf: 'flex-end' },
  legal: { fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.background, padding: 10, borderRadius: Radius.md, lineHeight: 17 },
});
