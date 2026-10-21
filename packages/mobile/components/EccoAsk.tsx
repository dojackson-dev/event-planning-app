import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import type { EccoAnswer, EccoRole } from '@/lib/ecco';

type Props = {
  role: EccoRole;
  suggestions: string[];
  onOpen: (href: string) => void;
};

export default function EccoAsk({ role, suggestions, onOpen }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<EccoAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setQuestion(q);
    setLoading(true);
    setError('');
    try {
      setAnswer(await apiRequest<EccoAnswer>('/assistant/ask', { method: 'POST', body: { question: q, role } }));
    } catch (err: any) {
      setAnswer(null);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text style={styles.heading}>Ask Ecco</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          maxLength={200}
          placeholder="Ask Ecco about your events, balances or bookings…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={() => ask(question)}
          accessibilityLabel="Ask Ecco"
        />
        <TouchableOpacity
          style={[styles.send, (loading || !question.trim()) && { opacity: 0.5 }]}
          onPress={() => ask(question)}
          disabled={loading || !question.trim()}
          accessibilityLabel="Send question"
        >
          {loading ? <ActivityIndicator size="small" color={Colors.textWhite} /> : <Ionicons name="send" size={16} color={Colors.textWhite} />}
        </TouchableOpacity>
      </View>

      <View style={styles.chips}>
        {suggestions.map((s) => (
          <TouchableOpacity key={s} style={styles.chip} onPress={() => ask(s)} disabled={loading}>
            <Text style={styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {answer && (
        <View style={styles.answer} accessibilityLiveRegion="polite">
          <Text style={styles.answerText}>{answer.answer}</Text>
          {answer.items.map((item) => (
            <TouchableOpacity key={`${item.href}-${item.detail}`} style={styles.item} onPress={() => onOpen(item.href)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemDetail}>{item.detail}</Text>
              </View>
              <Text style={styles.open}>Open</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  send: { width: 44, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, color: Colors.textSecondary },
  error: { marginTop: 10, fontSize: 13, color: Colors.error },
  answer: { marginTop: 12, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: 12 },
  answerText: { fontSize: 14, color: Colors.textPrimary },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  itemLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  open: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
