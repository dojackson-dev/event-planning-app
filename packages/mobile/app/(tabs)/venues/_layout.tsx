import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function VenuesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Venues',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Venues' }} />
      <Stack.Screen name="new" options={{ title: 'New Venue', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Venue' }} />
    </Stack>
  );
}
