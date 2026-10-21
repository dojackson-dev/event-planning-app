import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ClientEstimatesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Estimates',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Estimates', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Estimate' }} />
    </Stack>
  );
}
