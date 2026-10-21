import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';
import { CliMsgBackButton } from '@/components/CliMsgShared';

export default function ClientRsvpLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'RSVP',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'RSVP', headerLeft: () => <CliMsgBackButton /> }} />
      <Stack.Screen name="[formId]" options={{ title: 'Guest List' }} />
    </Stack>
  );
}
