import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Text, View } from 'react-native';

// Prevent the splash screen from auto-hiding
try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.warn('SplashScreen error:', e);
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Add any initialization logic here
        await new Promise(resolve => setTimeout(resolve, 100));
        setAppReady(true);
      } catch (e) {
        console.error('App initialization error:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Error hiding splash screen:', e);
        }
      }
    }

    prepare();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>
          Error: {error}
        </Text>
      </View>
    );
  }

  if (!appReady) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
