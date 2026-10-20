import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AcctErrorState from '@/components/AcctErrorState';

interface ClientMessage {
  id: string;
  sender_type: 'owner' | 'client';
  content: string;
  created_at: string;
}

export default function ClientChatScreen() {
  const { eventId, clientName, eventName } = useLocalSearchParams<{ eventId: string; clientName?: string; eventName?: string }>();
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ClientMessage>>(null);

  const load = useCallback(async (initial = false) => {
    try {
      const data = await apiRequest<ClientMessage[]>(`/messages/client-inbox/${eventId}`);
      setMessages(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      // Background polls keep the existing messages visible on failure.
      if (initial) setError(err?.message || 'Failed to load conversation.');
    } finally {
      if (initial) setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(useCallback(() => {
    load(true);
    // Mirrors the web thread view: poll every 5s for new client messages.
    const interval = setInterval(() => load(false), 5000);
    return () => clearInterval(interval);
  }, [load]));

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const sent = await apiRequest<ClientMessage>(`/messages/client-inbox/${eventId}/reply`, {
        method: 'POST',
        body: { content },
      });
      setMessages(prev => [...prev, sent]);
      setDraft('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const title = clientName || 'Conversation';

  const renderItem = ({ item }: { item: ClientMessage }) => {
    const isMe = item.sender_type === 'owner';
    const d = new Date(item.created_at);
    return (
      <View style={[styles.bubbleWrap, isMe ? styles.right : styles.left]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            {' · '}
            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title }} />
      {eventName ? <Text style={styles.subHeader} numberOfLines={1}>{eventName}</Text> : null}
      {loading ? <LoadingState message="Loading conversation…" /> :
        error ? <AcctErrorState message={error} onRetry={() => { setLoading(true); load(true); }} /> : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <EmptyState icon="chatbubble-outline" title="No messages yet" message="Send a message to start the conversation." />
            }
          />
        )}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={`Reply to ${title}…`}
          placeholderTextColor={Colors.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!draft.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color={Colors.textWhite} /> : <Ionicons name="send" size={18} color={Colors.textWhite} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  subHeader: { fontSize: 12, color: Colors.textSecondary, backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
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
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  input: { flex: 1, maxHeight: 110, backgroundColor: Colors.background, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
