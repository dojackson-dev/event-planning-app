import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function BillingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textWhite,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Billing',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Billing & Subscription' }} />
    </Stack>
  );
}
