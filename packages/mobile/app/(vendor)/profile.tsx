import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';

interface VendorAccount {
  id: string;
  business_name: string;
  category?: string;
  bio?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  hourly_rate?: number;
  flat_rate?: number;
  rate_description?: string;
}

const VENDOR_CATEGORIES = [
  { value: 'dj', label: 'DJ' },
  { value: 'decorator', label: 'Decorator' },
  { value: 'planner_coordinator', label: 'Planner/Coordinator' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'musicians', label: 'Musicians' },
  { value: 'mc_host', label: 'MC/Host' },
  { value: 'other', label: 'Other' },
];

export default function VendorProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [flatRate, setFlatRate] = useState('');
  const [rateDescription, setRateDescription] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiRequest<VendorAccount>('/vendors/account/me');
      setBusinessName(data.business_name || '');
      setCategory(data.category || '');
      setBio(data.bio || '');
      setPhone(data.phone || '');
      setWebsite(data.website || '');
      setInstagram(data.instagram || '');
      setCity(data.city || '');
      setState(data.state || '');
      setZipCode(data.zip_code || '');
      setHourlyRate(data.hourly_rate != null ? String(data.hourly_rate) : '');
      setFlatRate(data.flat_rate != null ? String(data.flat_rate) : '');
      setRateDescription(data.rate_description || '');
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load your vendor profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      await apiRequest('/vendors/account/me', {
        method: 'PUT',
        body: {
          businessName: businessName || undefined,
          categories: category ? [category] : undefined,
          bio,
          city,
          state,
          zipCode,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
          flatRate: flatRate ? parseFloat(flatRate) : undefined,
          rateDescription,
          phone,
          website,
          instagram,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load profile"
          message={loadError}
        />
        <View style={styles.retryWrap}>
          <AppButton title="Try Again" onPress={loadProfile} variant="outline" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="e.g. DJ Jay Entertainment"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipsWrap}>
          {VENDOR_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, category === cat.value && styles.chipActive]}
              onPress={() => setCategory(cat.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, category === cat.value && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>About Your Business</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell clients what makes your business special…"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Dallas"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.section, styles.rowItem]}>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={setState}
            placeholder="TX"
            placeholderTextColor={Colors.textMuted}
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>
        <View style={[styles.section, styles.rowItem]}>
          <Text style={styles.label}>Zip Code</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="75001"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.section, styles.rowItem]}>
          <Text style={styles.label}>Hourly Rate ($)</Text>
          <TextInput
            style={styles.input}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.section, styles.rowItem]}>
          <Text style={styles.label}>Flat Rate ($)</Text>
          <TextInput
            style={styles.input}
            value={flatRate}
            onChangeText={setFlatRate}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Rate Description</Text>
        <TextInput
          style={styles.input}
          value={rateDescription}
          onChangeText={setRateDescription}
          placeholder="e.g. 4-hour minimum, travel included within 50 miles"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 000-0000"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholder="https://yourwebsite.com"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Instagram</Text>
        <TextInput
          style={styles.input}
          value={instagram}
          onChangeText={setInstagram}
          placeholder="@yourhandle"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      </View>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      {saved ? <Text style={styles.successText}>Saved successfully</Text> : null}

      <AppButton
        title={saving ? 'Saving...' : 'Save Changes'}
        onPress={handleSave}
        loading={saving}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  retryWrap: { paddingHorizontal: 32, marginTop: -20 },

  section: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },

  errorText: { fontSize: 13, color: Colors.error, marginBottom: 12, textAlign: 'center' },
  successText: { fontSize: 13, color: Colors.success, marginBottom: 12, textAlign: 'center', fontWeight: '600' },
  saveBtn: { marginTop: 4, ...Shadow.sm },
});
