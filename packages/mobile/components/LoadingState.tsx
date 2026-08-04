import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/lib/theme';

type LoadingStateProps = {
  message?: string;
};

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
