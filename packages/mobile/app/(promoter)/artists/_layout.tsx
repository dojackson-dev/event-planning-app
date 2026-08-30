import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ArtistsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Book an Artist' }} />
      <Stack.Screen name="[id]" options={{ title: 'Artist Profile' }} />
    </Stack>
  );
}
