import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function RsvpLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'RSVP Manager' }} />
      <Stack.Screen name="[intakeFormId]" options={{ title: 'RSVPs' }} />
    </Stack>
  );
}
