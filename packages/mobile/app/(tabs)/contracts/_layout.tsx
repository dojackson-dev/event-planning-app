import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ContractsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Contracts' }} />
      <Stack.Screen name="new" options={{ title: 'New Contract' }} />
      <Stack.Screen name="[id]" options={{ title: 'Contract' }} />
    </Stack>
  );
}
