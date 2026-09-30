import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Dashboard',
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Promoter Dashboard' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="events" options={{ headerShown: false }} />
      <Stack.Screen name="artists" options={{ headerShown: false }} />
      <Stack.Screen name="bookings" options={{ headerShown: false }} />
      <Stack.Screen name="vendors" options={{ headerShown: false }} />
      <Stack.Screen name="vendor-bookings" options={{ headerShown: false }} />
      <Stack.Screen name="invoices" options={{ headerShown: false }} />
      <Stack.Screen name="artist-bills" options={{ headerShown: false }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
    </Stack>
  );
}
