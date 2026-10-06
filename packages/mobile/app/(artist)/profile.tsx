import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';

interface ArtistProfileForm {
  artist_name: string;
  stage_name: string;
  description: string;
  booking_email: string;
  booking_phone: string;
  website: string;
  instagram: string;
  available_for_booking: boolean;
}

const EMPTY_FORM: ArtistProfileForm = {
  artist_name: '',
  stage_name: '',
  description: '',
  booking_email: '',
  booking_phone: '',
  website: '',
  instagram: '',
  available_for_booking: true,
};

export default function ArtistProfileScreen() {
  const [form, setForm] = useState<ArtistProfileForm>(EMPTY_FORM);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any>('/artists/me/profile');
      if (data) {
        setHasProfile(true);
        setForm({
          artist_name: data.artist_name ?? '',
          stage_name: data.stage_name ?? '',
          description: data.description ?? '',
          booking_email: data.booking_email ?? '',
          booking_phone: data.booking_phone ?? '',
          website: data.website ?? '',
          instagram: data.instagram ?? '',
          available_for_booking: data.available_for_booking ?? true,
        });
      } else {
        setHasProfile(false);
        setForm(EMPTY_FORM);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = <K extends keyof ArtistProfileForm>(key: K, value: ArtistProfileForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/artists/me/profile', {
        method: 'PUT',
        body: {
          artistName: form.artist_name,
          stageName: form.stage_name,
          description: form.description,
          bookingEmail: form.booking_email,
          bookingPhone: form.booking_phone,
          website: form.website,
          instagram: form.instagram,
          availableForBooking: form.available_for_booking,
        },
      });
      setHasProfile(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading your profile..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!hasProfile && (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.warningText} />
          <Text style={styles.noticeText}>
            No artist account found yet. Fill this out and save — your artist account must be set up first for the save to succeed.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {saved && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.successText} />
          <Text style={styles.successText}>Profile saved</Text>
        </View>
      )}

      <Field label="Artist Name">
        <TextInput
          style={styles.input}
          value={form.artist_name}
          onChangeText={(v) => set('artist_name', v)}
          placeholder="Your name or band name"
          placeholderTextColor={Colors.textMuted}
        />
      </Field>
      <Field label="Stage Name">
        <TextInput
          style={styles.input}
          value={form.stage_name}
          onChangeText={(v) => set('stage_name', v)}
          placeholder="Optional stage name"
          placeholderTextColor={Colors.textMuted}
        />
      </Field>
      <Field label="Bio">
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(v) => set('description', v)}
          placeholder="Tell promoters about yourself"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </Field>
      <Field label="Booking Email">
        <TextInput
          style={styles.input}
          value={form.booking_email}
          onChangeText={(v) => set('booking_email', v)}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Booking Phone">
        <TextInput
          style={styles.input}
          value={form.booking_phone}
          onChangeText={(v) => set('booking_phone', v)}
          placeholder="(555) 555-5555"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />
      </Field>
      <Field label="Website">
        <TextInput
          style={styles.input}
          value={form.website}
          onChangeText={(v) => set('website', v)}
          placeholder="https://"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      </Field>
      <Field label="Instagram">
        <TextInput
          style={styles.input}
          value={form.instagram}
          onChangeText={(v) => set('instagram', v)}
          placeholder="@yourhandle"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Available for booking</Text>
        <Switch
          value={form.available_for_booking}
          onValueChange={(v) => set('available_for_booking', v)}
          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
          thumbColor={form.available_for_booking ? Colors.primary : '#f4f3f4'}
        />
      </View>

      <AppButton title="Save Profile" onPress={handleSave} loading={saving} style={styles.saveBtn} />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  noticeBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.warningLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.warningText },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.errorText, fontSize: 13 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  successText: { color: Colors.successText, fontSize: 13, fontWeight: '600' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, marginBottom: 24, ...Shadow.sm,
  },
  switchLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  saveBtn: { marginTop: 4 },
});
