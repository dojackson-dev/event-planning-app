import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '@/lib/theme';

const BROWSE_ITEMS = [
  { icon: 'calendar-outline' as const, label: 'Browse Events', route: '/(guest)/events' },
  { icon: 'storefront-outline' as const, label: 'Browse Vendors', route: '/(guest)/vendors' },
  { icon: 'business-outline' as const, label: 'Browse Venues', route: '/(guest)/venues' },
];

export default function GuestHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <Image
          source={require('@/assets/eventecos-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>EventEcos</Text>
        <Text style={styles.tagline}>Discover events, vendors & venues near you</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginBtnText}>Log In</Text>
        </TouchableOpacity>

        <View style={styles.browseSection}>
          <Text style={styles.browseLabel}>Or browse as a guest</Text>
          {BROWSE_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.browseBtn}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon} size={18} color={Colors.primary} />
              <Text style={styles.browseBtnText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupLink}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 40 },
  logo: { width: 96, height: 96, marginBottom: 16, borderRadius: Radius.lg, ...Shadow.sm },
  brandName: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  tagline: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  actions: { paddingHorizontal: 24, gap: 14 },
  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15,
    alignItems: 'center', ...Shadow.sm,
  },
  loginBtnText: { color: Colors.textWhite, fontSize: 16, fontWeight: '700' },
  browseSection: { gap: 10, marginTop: 4 },
  browseLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, textAlign: 'center', marginBottom: 2,
  },
  browseBtn: {
    flexDirection: 'row', gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  browseBtnText: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  signupText: { textAlign: 'center', color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  signupLink: { color: Colors.primary, fontWeight: '700' },
});
