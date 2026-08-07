import 'react-native-url-polyfill/auto';
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';
import { resolveDashboardRouteForSession } from '@/lib/roleRouting';

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
      const onIndex = segmentsRef.current[0] === 'index' || segmentsRef.current.length === 0;
      if (!session && !inAuthGroup) {
        routerRef.current.replace('/(auth)/login');
      } else if (session && (inAuthGroup || onIndex)) {
        const route = await resolveDashboardRouteForSession(session);
        routerRef.current.replace(route as any);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="events/[eventId]"
        options={{
          headerShown: true,
          headerTitle: 'Event Details',
          headerBackTitleVisible: false,
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
          headerBackTitleVisible: false,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
