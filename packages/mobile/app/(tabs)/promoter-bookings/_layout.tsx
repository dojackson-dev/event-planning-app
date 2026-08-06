import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterBookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Bookings',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Bookings' }} />
      <Stack.Screen name="[id]" options={{ title: 'Booking' }} />
    </Stack>
  );
}
