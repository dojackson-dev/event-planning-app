import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import { CliMsgAvatar, formatDate, formatStamp, useClientFail } from '@/components/CliMsgShared';

export interface ClientContact {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  ownerId: string;
  ownerBusinessName: string;
  ownerLogoUrl: string | null;
  clientName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageSender: string | null;
  unreadCount: number;
}

const byRecent = (a: ClientContact, b: ClientContact) => {
  const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
  const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
  return tb - ta;
};

export default function ClientMessagesScreen() {
  const router = useRouter();
  const fail = useClientFail();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await clientApi<ClientContact[]>('/contacts');
      setContacts((Array.isArray(data) ? data : []).slice().sort(byRecent));
      setError(null);
    } catch (err) {
      setError(fail(err, 'Failed to load conversations.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fail]);

  // Reload on focus so unread counts clear after returning from a thread.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.container}><LoadingState message="Loading conversations…" /></View>;
  if (error && contacts.length === 0) {
    return (
      <View style={styles.container}>
        <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(c) => c.eventId}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={error ? <Text style={styles.banner}>{error}</Text> : null}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            message="Contacts appear once your events are confirmed."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => router.push({ pathname: '/(client)/messages/[eventId]', params: { eventId: item.eventId } } as never)}
          >
            <CliMsgAvatar name={item.ownerBusinessName} />
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={[styles.name, item.unreadCount > 0 && styles.nameUnread]} numberOfLines={1}>
                  {item.ownerBusinessName}
                </Text>
                {item.lastMessageAt ? <Text style={styles.time}>{formatStamp(item.lastMessageAt)}</Text> : null}
              </View>
              <Text style={styles.event} numberOfLines={1}>
                {item.eventName}
                {item.eventDate ? ` · ${formatDate(item.eventDate)}` : ''}
              </Text>
              <View style={styles.row}>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage
                    ? `${item.lastMessageSender === 'client' ? 'You: ' : ''}${item.lastMessage}`
                    : 'No messages yet'}
                </Text>
                {item.unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, ...Shadow.sm,
  },
  body: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 12, color: Colors.textMuted },
  event: { fontSize: 12, color: Colors.textSecondary },
  preview: { flex: 1, fontSize: 13, color: Colors.textMuted },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.textWhite },
});
