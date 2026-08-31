import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function BookingRequestsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Booking Requests' }} />
    </Stack>
  );
}
