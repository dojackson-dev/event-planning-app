import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to auth/login on app start
  return <Redirect href="/(auth)/login" />;
}
