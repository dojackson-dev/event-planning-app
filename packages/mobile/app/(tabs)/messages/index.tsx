import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface Message {
  id: string;
  message_type: string;
  status: string;
  recipient_phone: string;
  content: string;
  created_at: string;
  event?: { name?: string } | null;
}

interface MessageStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
}

const STATUS_COLORS: Record<string, string> = {
  sent: '#3B82F6',
  delivered: '#10B981',
  failed: '#EF4444',
  pending: '#F59E0B',
  queued: '#8B5CF6',
};

const TYPE_ICONS: Record<string, string> = {
  confirmation: 'checkmark-circle-outline',
  reminder: 'alarm-outline',
  invoice: 'receipt-outline',
  update: 'information-circle-outline',
  custom: 'chatbubble-ellipses-outline',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function MessagesIndexScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [msgs, st] = await Promise.all([
        apiRequest<{ messages: Message[] }>('/messages').catch(() => ({ messages: [] })),
        apiRequest<MessageStats>('/messages/stats').catch(() => null),
      ]);
      setMessages(Array.isArray(msgs) ? msgs : (msgs.messages || []));
      setStats(st);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }: { item: Message }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const icon = (TYPE_ICONS[item.message_type] || 'chatbubble-outline') as any;
    return (
      <View style={styles.messageCard}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageTop}>
            <Text style={styles.messagePhone}>{item.recipient_phone}</Text>
            <Text style={styles.messageTime}>{formatDate(item.created_at)}</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={2}>{item.content}</Text>
          <View style={styles.messageMeta}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{item.status}</Text>
            <Text style={styles.messageType}> · {item.message_type}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.total ?? 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#3B82F6' }]}>{stats.sent ?? 0}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.delivered ?? 0}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>{stats.failed ?? 0}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Send your first message to a client</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/messages/send' as any)}>
        <Ionicons name="send" size={20} color="#FFF" />
        <Text style={styles.fabText}>Send Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  list: { padding: 16, paddingBottom: 100 },
  messageCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, ...Shadow.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  messageContent: { flex: 1 },
  messageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  messagePhone: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  messageTime: { fontSize: 12, color: Colors.textMuted },
  messageText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  messageType: { fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...Shadow.lg },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
