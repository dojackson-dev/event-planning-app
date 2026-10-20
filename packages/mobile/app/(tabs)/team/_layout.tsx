import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function TeamLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Team' }} />
    </Stack>
  );
}
