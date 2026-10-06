import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function VendorInvoicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Vendor Invoices',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Vendor Invoices' }} />
      <Stack.Screen name="[id]" options={{ title: 'Invoice' }} />
    </Stack>
  );
}
