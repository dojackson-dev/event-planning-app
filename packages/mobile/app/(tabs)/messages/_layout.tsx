import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen name="send" options={{ title: 'Send Message' }} />
      <Stack.Screen name="[id]" options={{ title: 'Message Details' }} />
      <Stack.Screen name="chat/[eventId]" options={{ title: 'Conversation' }} />
    </Stack>
  );
}
