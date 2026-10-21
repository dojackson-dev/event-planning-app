import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';
import { CliMsgBackButton } from '@/components/CliMsgShared';

export default function ClientItemsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Items',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Items & Packages', headerLeft: () => <CliMsgBackButton /> }} />
    </Stack>
  );
}
