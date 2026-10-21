import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { clientApi, ClientAuthError } from '@/lib/clientApi';
import { toList } from '@/components/netFormat';
import { mapClientLink, pick } from '@/components/CliShared';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import CliErrorState from '@/components/CliErrorState';

type Notif = {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  read?: boolean;
  created_at?: string;
  link_url?: string;
  [key: string]: unknown;
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  booking: 'calendar-outline',
  message: 'chatbubble-outline',
  contract: 'document-text-outline',
  estimate: 'document-text-outline',
  item: 'cube-outline',
  alert: 'alert-circle-outline',
  invoice: 'receipt-outline',
};

// Dynamic notifications are generated server-side and have no DB row to mark.
const isDynamic = (n: Notif) => String(n.id).startsWith('dynamic-');

function formatStamp(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ClientNotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await clientApi('/notifications');
      setItems(toList<Notif>(res).map((n) => ({ ...n, read: !!n.read })));
      setError(null);
    } catch (e: any) {
      if (e instanceof ClientAuthError) {
        router.replace('/(auth)/client-login' as never);
        return;
      }
      setError(e?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setRead = (id: string, read: boolean) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)));

  const markRead = async (n: Notif) => {
    if (n.read) return;
    setRead(n.id, true);
    if (isDynamic(n)) return;
    try {
      await clientApi(`/notifications/${encodeURIComponent(n.id)}/read`, { method: 'PUT' });
    } catch (e: any) {
      if (e instanceof ClientAuthError) {
        router.replace('/(auth)/client-login' as never);
        return;
      }
      setRead(n.id, false);
      Alert.alert('Could not update', e?.message || 'Failed to mark notification as read.');
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    if (unread.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const results = await Promise.allSettled(
      unread.filter((n) => !isDynamic(n)).map((n) =>
        clientApi(`/notifications/${encodeURIComponent(n.id)}/read`, { method: 'PUT' }),
      ),
    );
    const authFailed = results.some((r) => r.status === 'rejected' && r.reason instanceof ClientAuthError);
    if (authFailed) {
      router.replace('/(auth)/client-login' as never);
      return;
    }
    if (results.some((r) => r.status === 'rejected')) {
      Alert.alert('Some notifications could not be updated', 'Pull down to refresh and try again.');
      load('refresh');
    }
  };

  const open = (n: Notif) => {
    markRead(n);
    const target = mapClientLink(pick<string>(n, 'link_url', 'linkUrl'));
    if (target) router.push(target as never);
  };

  if (loading) return <LoadingState message="Loading notifications..." />;
  if (error && items.length === 0) {
    return <CliErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.content}
      data={items}
      keyExtractor={(n) => String(n.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={Colors.primary} />}
      ListHeaderComponent={
        items.length > 0 ? (
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.markAll}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="notifications-outline"
          title="No notifications yet"
          message="You'll receive notifications here about your events, invoices, contracts, and more."
        />
      }
      renderItem={({ item }) => {
        const unread = !item.read;
        const body = pick<string>(item, 'message', 'body', 'content');
        return (
          <TouchableOpacity
            style={[styles.card, Shadow.sm, unread && styles.cardUnread]}
            activeOpacity={0.8}
            onPress={() => open(item)}
          >
            <View style={[styles.iconWrap, { backgroundColor: unread ? Colors.primaryLight : Colors.borderLight }]}>
              <Ionicons
                name={TYPE_ICON[item.type ?? ''] ?? 'notifications-outline'}
                size={18}
                color={unread ? Colors.primary : Colors.textMuted}
              />
            </View>
            <View style={styles.text}>
              {!!item.title && <Text style={[styles.title, !unread && styles.titleRead]}>{item.title}</Text>}
              {!!body && <Text style={[styles.body, !unread && styles.bodyRead]}>{body}</Text>}
              {!!formatStamp(item.created_at) && <Text style={styles.stamp}>{formatStamp(item.created_at)}</Text>}
            </View>
            {unread ? (
              <View style={styles.dot} />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.border} />
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  emptyContent: { flexGrow: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerText: { fontSize: 13, color: Colors.textSecondary },
  markAll: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10,
  },
  cardUnread: { backgroundColor: Colors.primaryLight },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  titleRead: { color: Colors.textSecondary, fontWeight: '600' },
  body: { fontSize: 14, color: Colors.textPrimary, marginTop: 2, lineHeight: 19 },
  bodyRead: { color: Colors.textSecondary },
  stamp: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 6 },
});
