import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function ItemsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textWhite,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Items',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Items & Packages' }} />
    </Stack>
  );
}
