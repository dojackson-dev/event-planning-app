import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: 'Events',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Events' }} />
    </Stack>
  );
}
