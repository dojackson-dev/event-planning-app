import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, Keyboard, RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';
import { formatDate, formatStamp, formatTime, useClientFail } from '@/components/CliMsgShared';
import type { ClientContact } from './index';

interface ClientMessage {
  id: string;
  sender_type: 'owner' | 'client';
  content: string;
  is_read: boolean;
  created_at: string;
}

const POLL_MS = 5000;

// Merge by id so a poll that started before a send finished can't drop the new message.
function mergeMessages(prev: ClientMessage[], incoming: ClientMessage[]): ClientMessage[] {
  const byId = new Map<string, ClientMessage>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export default function ClientChatScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const fail = useClientFail();
  const insets = useSafeAreaInsets();
  const [contact, setContact] = useState<ClientContact | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const listRef = useRef<FlatList<ClientMessage>>(null);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const markRead = useCallback(async () => {
    try {
      await clientApi('/messages/read', { method: 'PATCH', body: { eventId } });
    } catch {
      // non-fatal; unread count just stays until the next open
    }
  }, [eventId]);

  const loadMessages = useCallback(async (): Promise<ClientMessage[]> => {
    const data = await clientApi<ClientMessage[]>(`/messages?eventId=${encodeURIComponent(String(eventId))}`);
    return Array.isArray(data) ? data : [];
  }, [eventId]);

  const initialLoad = useCallback(async () => {
    try {
      setError(null);
      const [contacts, msgs] = await Promise.all([
        clientApi<ClientContact[]>('/contacts'),
        loadMessages(),
      ]);
      const found = (Array.isArray(contacts) ? contacts : []).find((c) => c.eventId === eventId) ?? null;
      if (!found) {
        setError('This conversation is no longer available.');
        return;
      }
      setContact(found);
      setMessages(msgs);
      if (msgs.some((m) => m.sender_type === 'owner' && !m.is_read)) markRead();
    } catch (err) {
      setError(fail(err, 'Failed to load conversation.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, loadMessages, markRead, fail]);

  // Poll only while this screen is focused; cleanup on blur clears the interval.
  useFocusEffect(useCallback(() => {
    initialLoad();
    const interval = setInterval(async () => {
      try {
        const msgs = await loadMessages();
        setMessages((prev) => mergeMessages(prev, msgs));
        if (msgs.some((m) => m.sender_type === 'owner' && !m.is_read)) markRead();
      } catch {
        // keep existing messages visible
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [initialLoad, loadMessages, markRead]));

  const send = async () => {
    const content = draft.trim();
    if (!content || sending || !contact) return;
    setSending(true);
    try {
      const sent = await clientApi<ClientMessage>('/messages', {
        method: 'POST',
        body: { recipientId: contact.ownerId, eventId: contact.eventId, content },
      });
      setMessages((prev) => mergeMessages(prev, [sent]));
      setDraft('');
    } catch (err) {
      Alert.alert('Could not send', fail(err, 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const title = contact?.ownerBusinessName || 'Conversation';
  const canSend = !!draft.trim() && !sending && !!contact;

  const renderItem = ({ item }: { item: ClientMessage }) => {
    const isMe = item.sender_type === 'client';
    return (
      <View style={[styles.bubbleWrap, isMe ? styles.right : styles.left]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {formatTime(item.created_at)} · {formatStamp(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title }} />
      {loading ? (
        <LoadingState message="Loading conversation…" />
      ) : error ? (
        <AcctErrorState message={error} onRetry={() => { setLoading(true); initialLoad(); }} />
      ) : (
        <>
          {contact ? (
            <Text style={styles.subHeader} numberOfLines={1}>
              {contact.eventName}{contact.eventDate ? ` · ${formatDate(contact.eventDate)}` : ''}
            </Text>
          ) : null}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); initialLoad(); }} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <EmptyState icon="chatbubble-outline" title="No messages yet" message="Send your first message below." />
            }
          />
          <View style={[styles.composer, { paddingBottom: keyboardUp ? 10 : Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${title}…`}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {sending ? <ActivityIndicator size="small" color={Colors.textWhite} /> : <Ionicons name="send" size={18} color={Colors.textWhite} />}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  subHeader: {
    fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.surface,
    paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  list: { padding: 16, flexGrow: 1 },
  bubbleWrap: { marginBottom: 10, flexDirection: 'row' },
  right: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.borderLight, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 21 },
  bubbleTextMe: { color: Colors.textWhite },
  bubbleTime: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  bubbleTimeMe: { color: Colors.primaryLight },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, maxHeight: 120, backgroundColor: Colors.background, borderRadius: 20, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: Colors.textPrimary,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
