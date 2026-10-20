import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterEventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Events',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Events' }} />
      <Stack.Screen name="new" options={{ title: 'New Event' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit Event' }} />
      <Stack.Screen name="attendees" options={{ title: 'Attendees & Check-in' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Tickets' }} />
      <Stack.Screen name="vip" options={{ title: 'VIP' }} />
      <Stack.Screen name="[id]" options={{ title: 'Event Details' }} />
    </Stack>
  );
}
