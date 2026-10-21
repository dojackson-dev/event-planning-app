import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';
import { CliMsgBackButton } from '@/components/CliMsgShared';

export default function ClientMessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Messages',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Messages', headerLeft: () => <CliMsgBackButton /> }} />
      <Stack.Screen name="[eventId]" options={{ title: 'Conversation' }} />
    </Stack>
  );
}
