import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function MessageTemplatesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Message Templates' }} />
      <Stack.Screen name="[id]" options={{ title: 'Template' }} />
    </Stack>
  );
}
