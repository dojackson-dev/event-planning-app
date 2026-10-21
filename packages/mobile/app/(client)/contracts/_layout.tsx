import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ClientContractsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Contracts',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Contracts', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]" options={{ title: 'Contract' }} />
    </Stack>
  );
}
