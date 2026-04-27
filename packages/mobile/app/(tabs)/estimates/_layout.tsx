import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function EstimatesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Estimates',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Estimates' }} />
      <Stack.Screen name="new" options={{ title: 'New Estimate', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Estimate' }} />
    </Stack>
  );
}
