import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function SecurityLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Security' }} />
      <Stack.Screen name="[id]" options={{ title: 'Security Personnel' }} />
    </Stack>
  );
}
