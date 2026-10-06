import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function PromoterArtistBillsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.purple },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Artist Bills' }} />
    </Stack>
  );
}
