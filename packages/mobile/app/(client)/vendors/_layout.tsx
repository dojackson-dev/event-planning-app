import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';
import { CliMsgBackButton } from '@/components/CliMsgShared';

export default function ClientVendorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Vendors',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Vendors', headerLeft: () => <CliMsgBackButton /> }} />
      <Stack.Screen name="book" options={{ title: 'Request Booking' }} />
      <Stack.Screen name="review" options={{ title: 'Leave a Review' }} />
    </Stack>
  );
}
