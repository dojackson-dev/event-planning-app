import 'react-native-url-polyfill/auto';
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';
import { getSessionHomeRoute } from '@/lib/roleRouting';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  const routerRef = useRef(router);
  segmentsRef.current = segments;
  routerRef.current = router;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const inAuthGroup = segmentsRef.current[0] === '(auth)';
      const inGuestGroup = segmentsRef.current[0] === '(guest)';
      const onIndex = segmentsRef.current[0] === 'index' || (segmentsRef.current as string[]).length === 0;
      const inProtectedGroup = ['(tabs)', '(vendor)', '(artist)', '(promoter)'].includes(
        segmentsRef.current[0] as string,
      );
      if (!session && inProtectedGroup) {
        // Not logged in but trying to reach a role-gated area (e.g. just logged out) —
        // send to the public guest landing instead of forcing straight to the login form.
        routerRef.current.replace('/(guest)');
      } else if (session && (inAuthGroup || inGuestGroup || onIndex)) {
        try {
          const homeRoute = await getSessionHomeRoute(session.user);
          routerRef.current.replace(homeRoute as never);
        } catch {
          // Role/session resolution failed unexpectedly — don't leave the
          // user stuck; land them on the default attendee home instead.
          routerRef.current.replace('/(tabs)/' as never);
        }
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(guest)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(vendor)" />
      <Stack.Screen name="(artist)" />
      <Stack.Screen name="(promoter)" />
      <Stack.Screen
        name="events/[eventId]"
        options={{
          headerShown: true,
          headerTitle: 'Event Details',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="tickets/[ticketId]"
        options={{
          headerShown: true,
          headerTitle: 'My Ticket',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack>
    </SafeAreaProvider>
  );
}
