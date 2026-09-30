import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';

// Field names match the `artist_riders` table columns exactly — the backend
// stores/returns this DTO as-is with no camelCase transform (unlike /artists/me/profile).
// This covers the primary rider categories (contacts, travel, hospitality,
// technical, schedule, notes); it is not an exhaustive mirror of every field
// on the web rider form.
interface RiderForm {
  artist_manager: string;
  manager_phone: string;
  manager_email: string;
  traveling_party_size: string;
  transport_required: string;
  hotel_requirements: string;
  bottled_water: string;
  snacks: string;
  dietary_restrictions: string;
  hot_meal: boolean;
  hot_meal_notes: string;
  stage_size_min: string;
  sound_system: string;
  technical_notes: string;
  load_in_time: string;
  soundcheck_time: string;
  performance_duration: string;
  load_out_time: string;
  special_notes: string;
}

const EMPTY_FORM: RiderForm = {
  artist_manager: '',
  manager_phone: '',
  manager_email: '',
  traveling_party_size: '',
  transport_required: '',
  hotel_requirements: '',
  bottled_water: '',
  snacks: '',
  dietary_restrictions: '',
  hot_meal: false,
  hot_meal_notes: '',
  stage_size_min: '',
  sound_system: '',
  technical_notes: '',
  load_in_time: '',
  soundcheck_time: '',
  performance_duration: '',
  load_out_time: '',
  special_notes: '',
};

export default function ArtistRiderScreen() {
  const [form, setForm] = useState<RiderForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any>('/artists/me/rider');
      if (data) {
        setForm((f) => ({ ...f, ...data }));
      } else {
        setForm(EMPTY_FORM);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your rider');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = <K extends keyof RiderForm>(key: K, value: RiderForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/artists/me/rider', { method: 'PUT', body: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save your rider');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading your rider..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {saved && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.successText} />
          <Text style={styles.successText}>Rider saved</Text>
        </View>
      )}

      <Text style={styles.intro}>
        Your rider is shared with promoters who book you. Fill in your standard requirements — you can adjust per show.
      </Text>

      <Section title="Contacts">
        <Field label="Artist Manager">
          <TextInput style={styles.input} value={form.artist_manager} onChangeText={(v) => set('artist_manager', v)} placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Manager Phone">
          <TextInput style={styles.input} value={form.manager_phone} onChangeText={(v) => set('manager_phone', v)} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Manager Email">
          <TextInput style={styles.input} value={form.manager_email} onChangeText={(v) => set('manager_email', v)} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
        </Field>
      </Section>

      <Section title="Travel & Accommodation">
        <Field label="Number in Traveling Party">
          <TextInput style={styles.input} value={form.traveling_party_size} onChangeText={(v) => set('traveling_party_size', v)} keyboardType="numeric" placeholder="e.g. 4" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Transport Required">
          <TextInput style={styles.input} value={form.transport_required} onChangeText={(v) => set('transport_required', v)} placeholder="e.g. Ground transport" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Hotel Requirements">
          <TextInput style={[styles.input, styles.textArea]} value={form.hotel_requirements} onChangeText={(v) => set('hotel_requirements', v)} multiline numberOfLines={2} placeholder="e.g. 3 rooms minimum" placeholderTextColor={Colors.textMuted} />
        </Field>
      </Section>

      <Section title="Hospitality">
        <Field label="Bottled Water">
          <TextInput style={styles.input} value={form.bottled_water} onChangeText={(v) => set('bottled_water', v)} placeholder="e.g. 24 x still, 12 x sparkling" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Snacks">
          <TextInput style={styles.input} value={form.snacks} onChangeText={(v) => set('snacks', v)} placeholder="e.g. Fruit platter, nuts, chips" placeholderTextColor={Colors.textMuted} />
        </Field>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Hot meal required</Text>
          <Switch
            value={form.hot_meal}
            onValueChange={(v) => set('hot_meal', v)}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={form.hot_meal ? Colors.primary : '#f4f3f4'}
          />
        </View>
        {form.hot_meal && (
          <Field label="Hot Meal Details">
            <TextInput style={[styles.input, styles.textArea]} value={form.hot_meal_notes} onChangeText={(v) => set('hot_meal_notes', v)} multiline numberOfLines={2} placeholderTextColor={Colors.textMuted} />
          </Field>
        )}
        <Field label="Dietary Restrictions / Allergies">
          <TextInput style={[styles.input, styles.textArea]} value={form.dietary_restrictions} onChangeText={(v) => set('dietary_restrictions', v)} multiline numberOfLines={2} placeholder="e.g. Vegan, gluten-free, nut allergy" placeholderTextColor={Colors.textMuted} />
        </Field>
      </Section>

      <Section title="Technical Requirements">
        <Field label="Minimum Stage Size">
          <TextInput style={styles.input} value={form.stage_size_min} onChangeText={(v) => set('stage_size_min', v)} placeholder="e.g. 20ft wide x 16ft deep" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Sound System">
          <TextInput style={styles.input} value={form.sound_system} onChangeText={(v) => set('sound_system', v)} placeholder="e.g. Line array, 3000W minimum" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Additional Technical Notes">
          <TextInput style={[styles.input, styles.textArea]} value={form.technical_notes} onChangeText={(v) => set('technical_notes', v)} multiline numberOfLines={3} placeholder="Stage plot, input list, other details..." placeholderTextColor={Colors.textMuted} />
        </Field>
      </Section>

      <Section title="Schedule (Default Times)">
        <Field label="Load-In">
          <TextInput style={styles.input} value={form.load_in_time} onChangeText={(v) => set('load_in_time', v)} placeholder="e.g. 3:00 PM" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Soundcheck">
          <TextInput style={styles.input} value={form.soundcheck_time} onChangeText={(v) => set('soundcheck_time', v)} placeholder="e.g. 5:00 PM" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Set Duration">
          <TextInput style={styles.input} value={form.performance_duration} onChangeText={(v) => set('performance_duration', v)} placeholder="e.g. 75 min" placeholderTextColor={Colors.textMuted} />
        </Field>
        <Field label="Load-Out">
          <TextInput style={styles.input} value={form.load_out_time} onChangeText={(v) => set('load_out_time', v)} placeholder="e.g. 30 min after show" placeholderTextColor={Colors.textMuted} />
        </Field>
      </Section>

      <Section title="Special Notes">
        <Field label="Any Other Notes">
          <TextInput style={[styles.input, styles.textArea]} value={form.special_notes} onChangeText={(v) => set('special_notes', v)} multiline numberOfLines={3} placeholderTextColor={Colors.textMuted} />
        </Field>
      </Section>

      <AppButton title="Save Rider" onPress={handleSave} loading={saving} style={styles.saveBtn} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  intro: {
    fontSize: 13, color: Colors.primaryText, backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.errorText, fontSize: 13 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  successText: { color: Colors.successText, fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 16, ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  switchLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  saveBtn: { marginTop: 4 },
});
