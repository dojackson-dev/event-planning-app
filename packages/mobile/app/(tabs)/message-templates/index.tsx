import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';

interface MessageTemplate {
  id: string;
  name: string;
  messageType: string;
  content: string;
  recipientType: string;
  sendBeforeDays: number | null;
  sendTime: string | null;
  repeatIntervalDays: number | null;
  autoSend: boolean;
  isActive: boolean;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  reminder: { bg: Colors.infoLight, text: Colors.infoText },
  invoice: { bg: Colors.successLight, text: Colors.successText },
  confirmation: { bg: Colors.purpleLight, text: Colors.purpleText },
  update: { bg: Colors.warningLight, text: Colors.warningText },
};
const DEFAULT_TYPE_COLOR = { bg: Colors.borderLight, text: Colors.textSecondary };

export default function MessageTemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<MessageTemplate[]>('/message-templates');
      setTemplates(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load templates.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (t: MessageTemplate) => {
    setBusyId(t.id);
    try {
      await apiRequest(`/message-templates/${t.id}/toggle`, { method: 'POST' });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update template.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (t: MessageTemplate) => {
    Alert.alert('Delete template', `Delete "${t.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(t.id);
          try {
            await apiRequest(`/message-templates/${t.id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete template.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: t }: { item: MessageTemplate }) => {
    const tc = TYPE_COLORS[t.messageType] || DEFAULT_TYPE_COLOR;
    const busy = busyId === t.id;
    return (
      <TouchableOpacity
        style={[styles.card, !t.isActive && styles.inactive]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(tabs)/message-templates/[id]', params: { id: t.id } } as any)}
      >
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
        </View>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: tc.bg }]}><Text style={[styles.pillText, { color: tc.text }]}>{t.messageType}</Text></View>
          <View style={[styles.pill, { backgroundColor: Colors.borderLight }]}><Text style={[styles.pillText, { color: Colors.textSecondary }]}>{t.recipientType}</Text></View>
          {t.autoSend && (
            <View style={[styles.pill, { backgroundColor: Colors.successLight }]}><Text style={[styles.pillText, { color: Colors.successText }]}>Auto-send</Text></View>
          )}
          {!t.isActive && (
            <View style={[styles.pill, { backgroundColor: Colors.borderLight }]}><Text style={[styles.pillText, { color: Colors.textMuted }]}>Inactive</Text></View>
          )}
        </View>
        <Text style={styles.content} numberOfLines={3}>{t.content}</Text>
        <View style={styles.metaRow}>
          {t.sendBeforeDays !== null && t.sendBeforeDays !== undefined && (
            <Text style={styles.meta}>{t.sendBeforeDays} days before event</Text>
          )}
          {t.sendTime ? <Text style={styles.meta}>at {t.sendTime.slice(0, 5)}</Text> : null}
          {t.repeatIntervalDays ? <Text style={styles.meta}>every {t.repeatIntervalDays} days</Text> : null}
        </View>
        <View style={styles.actions}>
          {t.isActive && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/(tabs)/messages/send', params: { templateId: t.id } } as any)}
            >
              <Ionicons name="send-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionText}>Use</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggle(t)} disabled={busy}>
            <Ionicons name="power" size={16} color={t.isActive ? Colors.success : Colors.textMuted} />
            <Text style={[styles.actionText, { color: t.isActive ? Colors.success : Colors.textMuted }]}>{t.isActive ? 'Active' : 'Activate'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(t)} disabled={busy}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingState message="Loading templates…" />;
  if (error && templates.length === 0) return <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.intro}>Create and manage automated message schedules.</Text>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="document-text-outline" title="No message templates yet" message="Create your first template to reuse messages and automate reminders." />
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push({ pathname: '/(tabs)/message-templates/[id]', params: { id: 'new' } } as any)}>
        <Ionicons name="add" size={20} color={Colors.textWhite} />
        <Text style={styles.fabText}>Create Template</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  intro: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  inlineError: { color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 12, fontSize: 13 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12, ...Shadow.sm },
  inactive: { opacity: 0.65 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  content: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  meta: { fontSize: 12, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 18, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  fab: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...Shadow.lg },
  fabText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
