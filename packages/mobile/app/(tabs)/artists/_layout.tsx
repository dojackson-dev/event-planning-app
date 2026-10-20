import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ArtistsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Artists',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Artist Directory' }} />
      <Stack.Screen name="[id]" options={{ title: 'Artist' }} />
    </Stack>
  );
}
