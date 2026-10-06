import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterInvoicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Invoices' }} />
      <Stack.Screen name="new" options={{ title: 'New Invoice' }} />
      <Stack.Screen name="[id]" options={{ title: 'Invoice' }} />
    </Stack>
  );
}
