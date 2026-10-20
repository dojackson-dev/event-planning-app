import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctChips from '@/components/AcctChips';

interface Message {
  id: string;
  messageType: string;
  status: string;
  recipientName?: string | null;
  recipientPhone: string;
  content: string;
  createdAt: string;
  sentAt?: string | null;
}

interface MessageStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface ClientThread {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  clientName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageSender: string | null;
  unreadCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  sent: Colors.info,
  delivered: Colors.success,
  failed: Colors.error,
  pending: Colors.warning,
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  confirmation: 'checkmark-circle-outline',
  reminder: 'alarm-outline',
  invoice: 'receipt-outline',
  update: 'information-circle-outline',
  support: 'help-buoy-outline',
  announcement: 'megaphone-outline',
  custom: 'chatbubble-ellipses-outline',
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'update', label: 'Update' },
  { value: 'custom', label: 'Custom' },
];

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

type Tab = 'sms' | 'chat';

export default function MessagesIndexScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sms');

  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [smsLoading, setSmsLoading] = useState(true);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [threads, setThreads] = useState<ClientThread[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const loadSms = useCallback(async () => {
    try {
      const [msgs, st] = await Promise.all([
        apiRequest<Message[]>('/messages'),
        apiRequest<MessageStats>('/messages/stats').catch(() => null),
      ]);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setStats(st);
      setSmsError(null);
    } catch (err: any) {
      setSmsError(err?.message || 'Failed to load messages.');
    } finally {
      setSmsLoading(false);
    }
  }, []);

  const loadChat = useCallback(async () => {
    try {
      const data = await apiRequest<ClientThread[]>('/messages/client-inbox');
      setThreads(Array.isArray(data) ? data : []);
      setChatError(null);
    } catch (err: any) {
      setChatError(err?.message || 'Failed to load client conversations.');
    } finally {
      setChatLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadSms();
    loadChat();
    // Mirrors the web inbox, which polls the thread list every 30s.
    const interval = setInterval(loadChat, 30000);
    return () => clearInterval(interval);
  }, [loadSms, loadChat]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSms(), loadChat()]);
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter(m => {
      const matchesSearch = !q
        || (m.recipientName ?? '').toLowerCase().includes(q)
        || (m.recipientPhone ?? '').includes(q)
        || (m.content ?? '').toLowerCase().includes(q);
      return matchesSearch
        && (!statusFilter || m.status === statusFilter)
        && (!typeFilter || m.messageType === typeFilter);
    });
  }, [messages, search, statusFilter, typeFilter]);

  const unreadTotal = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  const renderMessage = ({ item }: { item: Message }) => {
    const statusColor = STATUS_COLORS[item.status] || Colors.textSecondary;
    const icon = TYPE_ICONS[item.messageType] || 'chatbubble-outline';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(tabs)/messages/[id]', params: { id: item.id } } as any)}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.recipientName || item.recipientPhone}</Text>
            <Text style={styles.cardTime}>{formatDate(item.sentAt || item.createdAt)}</Text>
          </View>
          {item.recipientName ? <Text style={styles.cardPhone}>{item.recipientPhone}</Text> : null}
          <Text style={styles.cardText} numberOfLines={2}>{item.content}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{item.status}</Text>
            <Text style={styles.typeLabel}> · {item.messageType}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderThread = ({ item }: { item: ClientThread }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push({
        pathname: '/(tabs)/messages/chat/[eventId]',
        params: { eventId: item.eventId, clientName: item.clientName, eventName: item.eventName },
      } as any)}
    >
      <View style={[styles.iconWrap, styles.avatar]}>
        <Text style={styles.avatarText}>{initialsOf(item.clientName)}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, item.unreadCount > 0 && styles.bold]} numberOfLines={1}>{item.clientName}</Text>
          <Text style={styles.cardTime}>{formatDate(item.lastMessageAt)}</Text>
        </View>
        <Text style={styles.cardPhone} numberOfLines={1}>
          {item.eventName}
          {item.eventDate ? ` · ${new Date(item.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
        </Text>
        {item.lastMessage ? (
          <Text style={styles.cardText} numberOfLines={2}>
            {item.lastMessageSender === 'owner' ? 'You: ' : ''}{item.lastMessage}
          </Text>
        ) : null}
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'sms' && styles.tabActive]} onPress={() => setTab('sms')}>
          <Text style={[styles.tabText, tab === 'sms' && styles.tabTextActive]}>SMS Log</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'chat' && styles.tabActive]} onPress={() => setTab('chat')}>
          <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>Client Chat</Text>
          {unreadTotal > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadTotal > 9 ? '9+' : unreadTotal}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {tab === 'sms' ? (
        smsLoading ? <LoadingState message="Loading messages…" /> :
        smsError && messages.length === 0 ? <AcctErrorState message={smsError} onRetry={() => { setSmsLoading(true); loadSms(); }} /> : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                {smsError ? <Text style={styles.inlineError}>{smsError}</Text> : null}
                {stats && (
                  <View style={styles.statsRow}>
                    {([
                      ['Total', stats.total, Colors.textPrimary],
                      ['Sent', stats.sent, Colors.info],
                      ['Delivered', stats.delivered, Colors.success],
                      ['Failed', stats.failed, Colors.error],
                      ['Pending', stats.pending ?? 0, Colors.warning],
                    ] as [string, number, string][]).map(([label, n, color]) => (
                      <View key={label} style={styles.statBox}>
                        <Text style={[styles.statNum, { color }]}>{n ?? 0}</Text>
                        <Text style={styles.statLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search messages…"
                    placeholderTextColor={Colors.textMuted}
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.chipRow}><AcctChips options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} /></View>
                <View style={styles.chipRow}><AcctChips options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} /></View>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title={messages.length === 0 ? 'No messages yet' : 'No messages found'}
                message={messages.length === 0 ? 'Send your first message to a client.' : 'Try adjusting your search or filters.'}
              />
            }
          />
        )
      ) : (
        chatLoading ? <LoadingState message="Loading conversations…" /> :
        chatError && threads.length === 0 ? <AcctErrorState message={chatError} onRetry={() => { setChatLoading(true); loadChat(); }} /> : (
          <FlatList
            data={threads}
            keyExtractor={item => item.eventId}
            renderItem={renderThread}
            contentContainerStyle={styles.list}
            refreshControl={refreshControl}
            ListHeaderComponent={chatError ? <Text style={styles.inlineError}>{chatError}</Text> : null}
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title="No client messages yet"
                message="Clients can message you from their portal."
              />
            }
          />
        )
      )}

      {tab === 'sms' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(tabs)/message-templates' as any)}>
            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryActionText}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryAction} onPress={() => router.push('/(tabs)/messages/send' as any)}>
            <Ionicons name="send" size={18} color={Colors.textWhite} />
            <Text style={styles.primaryActionText}>Send SMS</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 110, flexGrow: 1 },
  inlineError: { color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 12, fontSize: 13 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 12, borderRadius: Radius.lg, marginBottom: 12, ...Shadow.sm },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary },
  chipRow: { marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start', ...Shadow.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatar: { backgroundColor: Colors.borderLight },
  avatarText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  bold: { fontWeight: '800' },
  cardTime: { fontSize: 12, color: Colors.textMuted },
  cardPhone: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  cardText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  typeLabel: { fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: Colors.textWhite, fontSize: 11, fontWeight: '700' },
  actions: { position: 'absolute', bottom: 24, left: 20, right: 20, flexDirection: 'row', gap: 10 },
  primaryAction: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...Shadow.lg },
  primaryActionText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
  secondaryAction: { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  secondaryActionText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
