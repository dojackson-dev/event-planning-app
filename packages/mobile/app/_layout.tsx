import 'react-native-url-polyfill/auto';
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  // Use refs so the auth listener always has the latest values
  // without being re-registered on every navigation
  const segmentsRef = useRef(segments);
  const routerRef = useRef(router);
  segmentsRef.current = segments;
  routerRef.current = router;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segmentsRef.current[0] === '(auth)';
      const onIndex = segmentsRef.current[0] === 'index' || segmentsRef.current.length === 0;
      if (!session && !inAuthGroup) {
        routerRef.current.replace('/(auth)/login');
      } else if (session && (inAuthGroup || onIndex)) {
        routerRef.current.replace('/(tabs)/');
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only register once on mount

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
