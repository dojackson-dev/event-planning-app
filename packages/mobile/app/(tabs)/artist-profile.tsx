import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

export default function ArtistProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [stageName, setStageName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [spotify, setSpotify] = useState('');
  const [performanceFeeMin, setPerformanceFeeMin] = useState('');
  const [performanceFeeMax, setPerformanceFeeMax] = useState('');
  const [availableForBooking, setAvailableForBooking] = useState(true);

  const load = useCallback(async () => {
    try {
      const a = await apiRequest<any>('/artists/me/profile');
      setArtistName(a.artist_name || '');
      setStageName(a.stage_name || '');
      setLocation(a.location || '');
      setDescription(a.description || '');
      setBookingEmail(a.booking_email || '');
      setBookingPhone(a.booking_phone || '');
      setWebsite(a.website || '');
      setInstagram(a.instagram || '');
      setSpotify(a.spotify || '');
      setPerformanceFeeMin(a.performance_fee_min != null ? String(a.performance_fee_min) : '');
      setPerformanceFeeMax(a.performance_fee_max != null ? String(a.performance_fee_max) : '');
      setAvailableForBooking(a.available_for_booking !== false);
    } catch (err: any) {
      console.error('Artist profile load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/artists/me/profile', {
        method: 'PUT',
        body: {
          artistName,
          stageName: stageName || undefined,
          location: location || undefined,
          description: description || undefined,
          bookingEmail: bookingEmail || undefined,
          bookingPhone: bookingPhone || undefined,
          website: website || undefined,
          instagram: instagram || undefined,
          spotify: spotify || undefined,
          performanceFeeMin: performanceFeeMin ? parseFloat(performanceFeeMin) : undefined,
          performanceFeeMax: performanceFeeMax ? parseFloat(performanceFeeMax) : undefined,
          availableForBooking,
        },
      });
      Alert.alert('Saved', 'Your artist profile has been updated.');
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
      <Text style={styles.sectionLabel}>Artist</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Artist / legal name" placeholderTextColor={Colors.textMuted} value={artistName} onChangeText={setArtistName} />
        <TextInput style={styles.input} placeholder="Stage name" placeholderTextColor={Colors.textMuted} value={stageName} onChangeText={setStageName} />
        <TextInput style={styles.input} placeholder="Location" placeholderTextColor={Colors.textMuted} value={location} onChangeText={setLocation} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Bio / description" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />
      </View>

      <View style={[styles.card, styles.switchRow]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Available for Booking</Text>
          <Text style={styles.switchSubtext}>Show your profile as bookable to promoters</Text>
        </View>
        <Switch value={availableForBooking} onValueChange={setAvailableForBooking} trackColor={{ true: Colors.primary }} />
      </View>

      <Text style={styles.sectionLabel}>Booking Contact</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Booking email" placeholderTextColor={Colors.textMuted} value={bookingEmail} onChangeText={setBookingEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Booking phone" placeholderTextColor={Colors.textMuted} value={bookingPhone} onChangeText={setBookingPhone} keyboardType="phone-pad" />
      </View>

      <Text style={styles.sectionLabel}>Links</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Website" placeholderTextColor={Colors.textMuted} value={website} onChangeText={setWebsite} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Instagram handle" placeholderTextColor={Colors.textMuted} value={instagram} onChangeText={setInstagram} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Spotify link" placeholderTextColor={Colors.textMuted} value={spotify} onChangeText={setSpotify} autoCapitalize="none" />
      </View>

      <Text style={styles.sectionLabel}>Performance Fee Range</Text>
      <View style={[styles.card, { flexDirection: 'row', gap: 10 }]}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min ($)" placeholderTextColor={Colors.textMuted} value={performanceFeeMin} onChangeText={setPerformanceFeeMin} keyboardType="decimal-pad" />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max ($)" placeholderTextColor={Colors.textMuted} value={performanceFeeMax} onChangeText={setPerformanceFeeMax} keyboardType="decimal-pad" />
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
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  switchSubtext: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error,
  },
  signOutText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
