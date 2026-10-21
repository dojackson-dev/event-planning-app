import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '@/lib/theme';
import { hasClientSession } from '@/lib/clientApi';

// Client portal: phone/SMS sign-in (see lib/clientApi.ts). Every screen in this
// group assumes a client session exists; without one we send the user to sign in.
export default function ClientLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasClientSession().then((ok) => {
      if (cancelled) return;
      if (ok) setReady(true);
      else router.replace('/(auth)/client-login' as never);
    });
    return () => { cancelled = true; };
  }, [router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'My Portal' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      {/* Folder routes render their own nested header/title. */}
      <Stack.Screen name="events" options={{ headerShown: false }} />
      <Stack.Screen name="estimates" options={{ headerShown: false }} />
      <Stack.Screen name="contracts" options={{ headerShown: false }} />
      <Stack.Screen name="invoices" options={{ headerShown: false }} />
      <Stack.Screen name="messages" options={{ headerShown: false }} />
      <Stack.Screen name="vendors" options={{ headerShown: false }} />
      <Stack.Screen name="items" options={{ headerShown: false }} />
      <Stack.Screen name="rsvp" options={{ headerShown: false }} />
    </Stack>
  );
}
