import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => { fetchUser(); }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + identity */}
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.emailText}>{user?.email || '—'}</Text>
        {createdAt && <Text style={styles.memberText}>Member since {createdAt}</Text>}
      </View>

      {/* Account info */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <InfoRow icon="mail-outline" label="Email" value={user?.email || '—'} />
        <View style={styles.rowDivider} />
        <InfoRow icon="shield-checkmark-outline" label="Role" value={user?.role || 'owner'} />
        <View style={styles.rowDivider} />
        <InfoRow icon="key-outline" label="User ID" value={user?.id ? `${user.id.slice(0, 8)}…` : '—'} mono />
      </View>

      {/* App info */}
      <Text style={styles.sectionLabel}>App</Text>
      <View style={styles.card}>
        <InfoRow icon="information-circle-outline" label="Version" value="1.0.0" />
        <View style={styles.rowDivider} />
        <InfoRow icon="server-outline" label="Environment" value="Production" />
      </View>

      {/* Sign out */}
      <Text style={styles.sectionLabel}>Account Actions</Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },

  heroCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
    alignItems: 'center', paddingVertical: 32, marginBottom: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  emailText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  memberText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 20,
    ...Shadow.sm, overflow: 'hidden',
  },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 16 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: Colors.textSecondary, maxWidth: '55%', textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 16,
    borderWidth: 1.5, borderColor: Colors.error, ...Shadow.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
