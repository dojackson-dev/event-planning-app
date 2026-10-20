import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function GuestListsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Guest Lists' }} />
      <Stack.Screen name="new" options={{ title: 'New Guest List' }} />
      <Stack.Screen name="[id]" options={{ title: 'Guest List' }} />
    </Stack>
  );
}
