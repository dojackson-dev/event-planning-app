import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { resolveDashboardRouteForSession } from '@/lib/roleRouting';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Route straight to the role-specific dashboard so returning users
        // (cold start with a persisted session) don't land on the generic
        // attendee tabs index — this must resolve the same route that
        // _layout.tsx's onAuthStateChange listener would, to avoid a race
        // where whichever one runs first/last wins.
        const route = await resolveDashboardRouteForSession(session);
        router.replace(route as any);
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
