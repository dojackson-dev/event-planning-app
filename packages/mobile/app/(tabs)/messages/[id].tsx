import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AcctErrorState from '@/components/AcctErrorState';
import AppButton from '@/components/AppButton';

interface MessageDetail {
  id: string;
  messageType: string;
  status: string;
  recipientName?: string | null;
  recipientPhone: string;
  content: string;
  createdAt: string;
  sentAt?: string | null;
  twilioSid?: string | null;
  errorMessage?: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  sent: { bg: Colors.infoLight, text: Colors.infoText },
  delivered: { bg: Colors.successLight, text: Colors.successText },
  failed: { bg: Colors.errorLight, text: Colors.errorText },
  pending: { bg: Colors.warningLight, text: Colors.warningText },
};

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'refresh' | 'delete' | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<MessageDetail>(`/messages/${id}`);
      setMessage(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load message.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refreshStatus = async () => {
    setBusy('refresh');
    try {
      await apiRequest(`/messages/${id}/refresh-status`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to refresh message status.');
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete message', 'Are you sure you want to delete this message record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await apiRequest(`/messages/${id}`, { method: 'DELETE' });
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete message.');
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Loading message…" />;
  if (error || !message) return <AcctErrorState message={error || 'Message not found.'} onRetry={() => { setLoading(true); load(); }} />;

  const sc = STATUS_COLORS[message.status] || { bg: Colors.borderLight, text: Colors.textSecondary };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.pillText, { color: sc.text }]}>{message.status}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: Colors.borderLight }]}>
            <Text style={[styles.pillText, { color: Colors.textSecondary }]}>{message.messageType}</Text>
          </View>
        </View>

        <Row label="Recipient" value={message.recipientName || '—'} />
        <Row label="Phone" value={message.recipientPhone || '—'} />
        <Row label="Sent at" value={message.sentAt ? new Date(message.sentAt).toLocaleString() : '—'} />
        {message.twilioSid ? <Row label="Twilio SID" value={message.twilioSid} mono /> : null}
        {message.status === 'failed' && message.errorMessage ? <Row label="Error" value={message.errorMessage} error /> : null}

        <Text style={styles.label}>Message content</Text>
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{message.content || '—'}</Text>
        </View>
      </View>

      {message.twilioSid ? (
        <AppButton title="Refresh status" variant="outline" loading={busy === 'refresh'} disabled={busy !== null} onPress={refreshStatus} style={styles.btn} />
      ) : null}
      <AppButton title="Delete" variant="ghost" loading={busy === 'delete'} disabled={busy !== null} onPress={confirmDelete} style={styles.btn} textStyle={{ color: Colors.error }} />
    </ScrollView>
  );
}

function Row({ label, value, mono, error }: { label: string; value: string; mono?: boolean; error?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono && styles.mono, error && { color: Colors.errorText }]} selectable>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 16 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  row: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 15, color: Colors.textPrimary },
  mono: { fontFamily: 'Courier', fontSize: 12, color: Colors.textSecondary },
  contentBox: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: 14 },
  contentText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  btn: { marginBottom: 10 },
});
