import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PaymentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textWhite,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Payments',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Payments' }} />
    </Stack>
  );
}
