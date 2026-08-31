import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function GuestLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: Colors.textPrimary },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="events" options={{ title: 'Events' }} />
      <Stack.Screen name="vendors" options={{ title: 'Vendors' }} />
      <Stack.Screen name="venues" options={{ title: 'Venues' }} />
    </Stack>
  );
}
