import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterContractsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Contracts',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Artist Contracts' }} />
      <Stack.Screen name="[id]" options={{ title: 'Contract' }} />
    </Stack>
  );
}
