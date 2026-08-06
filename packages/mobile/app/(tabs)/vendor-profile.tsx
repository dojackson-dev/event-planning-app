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

const CATEGORIES = [
  { value: 'dj', label: 'DJ' },
  { value: 'decorator', label: 'Decorator' },
  { value: 'planner_coordinator', label: 'Planner / Coordinator' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'musicians', label: 'Musicians' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'other', label: 'Other' },
];

export default function VendorProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const load = useCallback(async () => {
    try {
      const v = await apiRequest<any>('/vendors/account/me');
      setBusinessName(v.business_name || '');
      setCategory(v.category || '');
      setBio(v.bio || '');
      setPhone(v.phone || '');
      setEmail(v.email || '');
      setWebsite(v.website || '');
      setInstagram(v.instagram || '');
      setCity(v.city || '');
      setState(v.state || '');
      setZipCode(v.zip_code || '');
      setHourlyRate(v.hourly_rate != null ? String(v.hourly_rate) : '');
    } catch (err: any) {
      console.error('Vendor profile load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/vendors/account/me', {
        method: 'PUT',
        body: {
          businessName,
          category: category || undefined,
          bio: bio || undefined,
          phone: phone || undefined,
          email: email || undefined,
          website: website || undefined,
          instagram: instagram || undefined,
          city: city || undefined,
          state: state || undefined,
          zipCode: zipCode || undefined,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        },
      });
      Alert.alert('Saved', 'Your vendor profile has been updated.');
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
      <Text style={styles.sectionLabel}>Business</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Business name" placeholderTextColor={Colors.textMuted} value={businessName} onChangeText={setBusinessName} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Bio" placeholderTextColor={Colors.textMuted} value={bio} onChangeText={setBio} multiline />
      </View>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, category === c.value && styles.chipActive]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Contact</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={Colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Website" placeholderTextColor={Colors.textMuted} value={website} onChangeText={setWebsite} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Instagram handle" placeholderTextColor={Colors.textMuted} value={instagram} onChangeText={setInstagram} autoCapitalize="none" />
      </View>

      <Text style={styles.sectionLabel}>Location & Rates</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="City" placeholderTextColor={Colors.textMuted} value={city} onChangeText={setCity} />
          <TextInput style={[styles.input, { width: 70 }]} placeholder="State" placeholderTextColor={Colors.textMuted} value={state} onChangeText={setState} autoCapitalize="characters" maxLength={2} />
          <TextInput style={[styles.input, { width: 90 }]} placeholder="Zip" placeholderTextColor={Colors.textMuted} value={zipCode} onChangeText={setZipCode} keyboardType="number-pad" />
        </View>
        <TextInput style={styles.input} placeholder="Hourly rate ($)" placeholderTextColor={Colors.textMuted} value={hourlyRate} onChangeText={setHourlyRate} keyboardType="decimal-pad" />
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: '#FFF' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error,
  },
  signOutText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
