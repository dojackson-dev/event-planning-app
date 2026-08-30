import 'react-native-url-polyfill/auto';
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';
import { getRoleHomeRoute } from '@/lib/roleRouting';

async function getUserRole(userId: string): Promise<string> {
  try {
    // Try users table first (requires RLS policy allowing self-read)
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data?.role) return data.role;

    // Fallback: check user_metadata set at signup or by admin
    const { data: { user } } = await supabase.auth.getUser();
    const metaRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (metaRole) return metaRole;

    return 'attendee';
  } catch {
    return 'attendee';
  }
}

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
      const onIndex = segmentsRef.current[0] === 'index' || (segmentsRef.current as string[]).length === 0;
      if (!session && !inAuthGroup) {
        routerRef.current.replace('/(auth)/login');
      } else if (session && (inAuthGroup || onIndex)) {
        // Check user_metadata/app_metadata first (no RLS needed),
        // then fall back to DB lookup
        const metaRole =
          session.user.user_metadata?.role ||
          session.user.app_metadata?.role;
        const role = metaRole || await getUserRole(session.user.id);
        routerRef.current.replace(getRoleHomeRoute(role) as never);
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
  );
}
