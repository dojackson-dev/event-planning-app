import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function InvoicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Invoices',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Invoices' }} />
      <Stack.Screen name="new" options={{ title: 'New Invoice', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Invoice' }} />
    </Stack>
  );
}
