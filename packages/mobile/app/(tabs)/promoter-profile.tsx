import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

export default function PromoterProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');

  const load = useCallback(async () => {
    try {
      const p = await apiRequest<any>('/promoter/profile');
      setCompanyName(p.company_name || '');
      setContactName(p.contact_name || '');
      setEmail(p.email || '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setBio(p.bio || '');
      setWebsite(p.website || '');
      setInstagram(p.instagram || '');
    } catch (err: any) {
      console.error('Promoter profile load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/promoter/profile', {
        method: 'PUT',
        body: {
          companyName: companyName || undefined,
          contactName,
          email,
          phone: phone || undefined,
          location: location || undefined,
          bio: bio || undefined,
          website: website || undefined,
          instagram: instagram || undefined,
        },
      });
      Alert.alert('Saved', 'Your promoter profile has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Promoter</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Company name" placeholderTextColor={Colors.textMuted} value={companyName} onChangeText={setCompanyName} />
        <TextInput style={styles.input} placeholder="Contact name" placeholderTextColor={Colors.textMuted} value={contactName} onChangeText={setContactName} />
        <TextInput style={styles.input} placeholder="Location" placeholderTextColor={Colors.textMuted} value={location} onChangeText={setLocation} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Bio" placeholderTextColor={Colors.textMuted} value={bio} onChangeText={setBio} multiline />
      </View>

      <Text style={styles.sectionLabel}>Contact</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={Colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <Text style={styles.sectionLabel}>Links</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Website" placeholderTextColor={Colors.textMuted} value={website} onChangeText={setWebsite} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Instagram handle" placeholderTextColor={Colors.textMuted} value={instagram} onChangeText={setInstagram} autoCapitalize="none" />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 16 },
  input: {
    height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  textArea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error,
  },
  signOutText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
