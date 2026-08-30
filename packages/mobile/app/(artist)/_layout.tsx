import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ArtistLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Dashboard',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Artist Dashboard', headerBackVisible: false }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
      <Stack.Screen name="rider" options={{ title: 'My Rider' }} />
      <Stack.Screen name="bookings" options={{ headerShown: false }} />
      <Stack.Screen name="invoices" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
    </Stack>
  );
}
