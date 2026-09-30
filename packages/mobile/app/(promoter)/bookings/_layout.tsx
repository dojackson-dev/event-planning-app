import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Bookings' }} />
      <Stack.Screen name="[id]" options={{ title: 'Booking Detail' }} />
    </Stack>
  );
}
