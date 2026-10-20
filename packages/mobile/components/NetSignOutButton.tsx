import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AppButton from '@/components/AppButton';

// Portal sign-out (vendor/artist/promoter have no owner hamburger menu).
export default function NetSignOutButton() {
  const router = useRouter();

  const confirm = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return <AppButton title="Sign Out" onPress={confirm} variant="outline" />;
}
