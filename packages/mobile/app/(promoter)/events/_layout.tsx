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
      <Stack.Screen name="[id]" options={{ title: 'Event Details' }} />
    </Stack>
  );
}
