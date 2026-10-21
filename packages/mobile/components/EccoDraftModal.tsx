import { useState } from 'react';
import {
  Modal, View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Share, Linking,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import type { EccoDraft } from '@/lib/ecco';

// The user reviews and edits the message here; nothing is sent from EventEcos.
export default function EccoDraftModal({ draft, onClose }: { draft: EccoDraft; onClose: () => void }) {
  const [to, setTo] = useState(draft.to);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);

  const share = () => {
    Share.share({ message: `Subject: ${subject}\n\n${body}` }).catch(() => {});
  };

  const openEmail = () => {
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => Alert.alert('No email app', 'Use Share to copy or send this message another way.'));
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Draft follow-up</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>Review and edit before you send. Nothing is sent automatically.</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>To</Text>
            <TextInput
              style={styles.input}
              value={to}
              onChangeText={setTo}
              placeholder="Recipient email"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.label}>Subject</Text>
            <TextInput style={styles.input} value={subject} onChangeText={setSubject} />
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.body]}
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.actions}>
            <AppButton title="Share / Copy" variant="outline" onPress={share} style={styles.action} />
            <AppButton title="Open in email" onPress={openEmail} style={styles.action} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: 16, maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  note: { fontSize: 12, color: Colors.textSecondary, marginVertical: 8 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, marginBottom: 10,
  },
  body: { minHeight: 180 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  action: { flex: 1 },
});
