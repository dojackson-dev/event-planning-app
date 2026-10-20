import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function BookingLinkLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Booking Link' }} />
    </Stack>
  );
}
