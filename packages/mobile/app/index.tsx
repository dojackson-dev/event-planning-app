import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const [session, setSession] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  if (session === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (session === 'authenticated') {
    return <Redirect href="/(tabs)/events" />;
  }

  return <Redirect href="/(auth)/login" />;
}
