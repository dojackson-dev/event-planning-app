import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getSessionHomeRoute } from '@/lib/roleRouting';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let settled = false;
    const finish = (route: string) => {
      if (settled) return;
      settled = true;
      router.replace(route as never);
    };

    // Safety net: if session/role resolution ever hangs (e.g. a stalled
    // network call on cold start), don't leave the user stuck on this
    // spinner forever — fall back to the public guest landing.
    const safetyTimer = setTimeout(() => finish('/(guest)'), 10000);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          const homeRoute = await getSessionHomeRoute(session.user);
          finish(homeRoute);
        } else {
          finish('/(guest)');
        }
      })
      .catch(() => finish('/(guest)'))
      .finally(() => clearTimeout(safetyTimer));
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
