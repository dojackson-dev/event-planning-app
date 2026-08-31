import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import { PromoterProfile } from '@/types/promoter';

// PUT /promoter/profile accepts UpdatePromoterDto:
// { companyName?, contactName?, email?, phone?, location?, bio?, website?,
//   instagram?, profileImageUrl?, coverImageUrl? } and returns the updated row
// (404 if no promoter_accounts row exists for this user).

interface ProfileForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  website: string;
  instagram: string;
}

const EMPTY_FORM: ProfileForm = {
  companyName: '', contactName: '', email: '', phone: '',
  location: '', bio: '', website: '', instagram: '',
};

export default function PromoterProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  const fetchProfile = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<PromoterProfile | null>('/promoter/profile');
      if (data) {
        setForm({
          companyName: data.company_name ?? '',
          contactName: data.contact_name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          location: data.location ?? '',
          bio: data.bio ?? '',
          website: data.website ?? '',
          instagram: data.instagram ?? '',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/promoter/profile', {
        method: 'PUT',
        body: {
          companyName: form.companyName || undefined,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
          location: form.location || undefined,
          bio: form.bio || undefined,
          website: form.website || undefined,
          instagram: form.instagram || undefined,
        },
      });
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading profile..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.errorText} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
        {saved && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.successText} />
            <Text style={styles.successBannerText}>Profile saved</Text>
          </View>
        )}

        <View style={styles.card}>
          <Field label="Company / Promo Name">
            <TextInput
              style={styles.input}
              value={form.companyName}
              onChangeText={(v) => setField('companyName', v)}
              placeholder="Your promo company name"
              placeholderTextColor={Colors.textMuted}
            />
          </Field>

          <Field label="Contact Name *">
            <TextInput
              style={styles.input}
              value={form.contactName}
              onChangeText={(v) => setField('contactName', v)}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
            />
          </Field>

          <Field label="Email *">
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <Field label="Phone">
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="Location">
            <TextInput
              style={styles.input}
              value={form.location}
              onChangeText={(v) => setField('location', v)}
              placeholder="City, State"
              placeholderTextColor={Colors.textMuted}
            />
          </Field>

          <Field label="Website">
            <TextInput
              style={styles.input}
              value={form.website}
              onChangeText={(v) => setField('website', v)}
              placeholder="https://..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Instagram">
            <TextInput
              style={styles.input}
              value={form.instagram}
              onChangeText={(v) => setField('instagram', v)}
              placeholder="@yourhandle"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.bio}
              onChangeText={(v) => setField('bio', v)}
              placeholder="Tell people about yourself..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </Field>
        </View>

        <AppButton
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  errorBannerText: { flex: 1, color: Colors.errorText, fontSize: 13 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  successBannerText: { flex: 1, color: Colors.successText, fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 20 },

  field: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  saveBtn: { marginTop: 4 },
});
