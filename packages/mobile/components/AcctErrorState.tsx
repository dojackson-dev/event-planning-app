import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/lib/theme';
import AppButton from '@/components/AppButton';

type AcctErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export default function AcctErrorState({ message, onRetry }: AcctErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <AppButton title="Try again" variant="outline" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  message: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 12, minWidth: 140 },
});
