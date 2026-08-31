import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function VendorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="profile" options={{ title: 'Business Profile' }} />
      <Stack.Screen name="booking-requests" options={{ headerShown: false }} />
      <Stack.Screen name="booking-link" options={{ headerShown: false }} />
      <Stack.Screen name="invoices" options={{ headerShown: false }} />
      <Stack.Screen name="bookings" options={{ headerShown: false }} />
    </Stack>
  );
}
