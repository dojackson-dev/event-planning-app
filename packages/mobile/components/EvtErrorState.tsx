import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/lib/theme';
import AppButton from '@/components/AppButton';

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export default function EvtErrorState({ title = "Couldn't load", message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? <AppButton title="Retry" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 32, gap: 8,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  message: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 8, minWidth: 140 },
});
