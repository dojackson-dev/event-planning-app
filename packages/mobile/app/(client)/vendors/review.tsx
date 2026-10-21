import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clientApi } from '@/lib/clientApi';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import AcctField from '@/components/AcctField';
import { useClientFail } from '@/components/CliMsgShared';

export default function ClientVendorReviewScreen() {
  const { vendorId, vendorName } = useLocalSearchParams<{ vendorId: string; vendorName?: string }>();
  const router = useRouter();
  const fail = useClientFail();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError('Please choose a star rating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await clientApi('/vendors/review', {
        method: 'POST',
        body: { vendorAccountId: vendorId, rating, reviewText: text.trim() || undefined },
      });
      Alert.alert('Thank you!', 'Your review was submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      setError(fail(err, 'Failed to submit review.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>How was your experience with {vendorName || 'this vendor'}?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={40} color={n <= rating ? Colors.warning : Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
        <AcctField label="Review (optional)" value={text} onChangeText={setText} placeholder="Share details about your experience" multiline />
        {error ? <Text style={styles.banner}>{error}</Text> : null}
        <AppButton title="Submit review" onPress={submit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 15, color: Colors.textPrimary, marginBottom: 16 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  banner: { fontSize: 13, color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 12 },
});
