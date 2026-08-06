import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterEventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Events',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Events' }} />
      <Stack.Screen name="new" options={{ title: 'New Event', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Event' }} />
    </Stack>
  );
}
