import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function VendorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Vendors',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Vendors' }} />
      <Stack.Screen name="[id]" options={{ title: 'Vendor' }} />
      <Stack.Screen name="bookings" options={{ title: 'My Vendor Bookings', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
