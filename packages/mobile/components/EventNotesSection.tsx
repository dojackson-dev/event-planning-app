import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { apiRequest } from '@/lib/api';

interface EventNote {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EventNotesSection({ eventId }: { eventId: string }) {
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const data = await apiRequest<EventNote[]>(`/event-notes/event/${eventId}`);
      setNotes(data);
    } catch (err: any) {
      console.error('Failed to load event notes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const note = await apiRequest<EventNote>(`/event-notes/event/${eventId}`, {
        method: 'POST',
        body: { content },
      });
      setNotes((prev) => [note, ...prev]);
      setContent('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (noteId: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/event-notes/${noteId}`, { method: 'DELETE' });
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete note');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Notes</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a note about this event..."
          placeholderTextColor={Colors.textMuted}
          value={content}
          onChangeText={setContent}
          editable={!submitting}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!content.trim() || submitting) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!content.trim() || submitting}
        >
          <Ionicons name="send" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={Colors.primary} />
      ) : notes.length === 0 ? (
        <Text style={styles.emptyText}>No notes yet.</Text>
      ) : (
        <View style={styles.notesCard}>
          {notes.map((note, idx) => (
            <View key={note.id}>
              {idx > 0 && <View style={styles.rowDivider} />}
              <View style={styles.noteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <Text style={styles.noteMeta}>
                    {note.author_name || 'Unknown'}{note.author_role ? ` · ${note.author_role}` : ''} · {timeAgo(note.created_at)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(note.id)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2,
  },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: Radius.lg, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  emptyText: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  notesCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, ...Shadow.sm,
  },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12,
  },
  noteContent: { fontSize: 14, color: Colors.textPrimary, lineHeight: 19 },
  noteMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  rowDivider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 12 },
});
