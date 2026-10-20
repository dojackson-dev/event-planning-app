import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, Share, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import NetField from '@/components/NetField';

const FRONTEND_URL = 'https://eventecos.com';
const SLUG_REGEX = /^[a-z0-9-]{3,60}$/;

interface BookingLink {
  id: string;
  slug: string;
  is_active: boolean;
  custom_message: string | null;
}

// Mirrors web dashboard/promoter/booking-link: GET/POST /promoter/booking-links.
export default function PromoterBookingLinkScreen() {
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<BookingLink | null>('/promoter/booking-links/mine');
      if (data) {
        setLink(data);
        setSlug(data.slug);
        setIsActive(data.is_active);
        setMessage(data.custom_message ?? '');
      }
    } catch {
      // no link yet — leave the form empty
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!SLUG_REGEX.test(slug)) {
      Alert.alert('Validation', 'Slug must be 3-60 characters: lowercase letters, numbers and hyphens only.');
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest<BookingLink>('/promoter/booking-links', {
        method: 'POST',
        body: { slug, isActive, customMessage: message.trim() || undefined },
      });
      setLink(data);
      Alert.alert('Saved', 'Booking link saved!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save booking link.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading booking link..." />;

  const url = link ? `${FRONTEND_URL}/book-promoter/${link.slug}` : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.title}>Your Booking Link</Text>
        {!link && (
          <View style={styles.prompt}>
            <Ionicons name="link-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.promptText}>Create a public link so artists and clients can request to work with you.</Text>
          </View>
        )}
        {!!link && link.is_active && (
          <View style={styles.urlBox}>
            <Ionicons name="globe-outline" size={16} color={Colors.successText} />
            <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
            <TouchableOpacity onPress={() => Share.share({ message: url }).catch(() => {})} hitSlop={8}>
              <Ionicons name="share-outline" size={18} color={Colors.successText} />
            </TouchableOpacity>
          </View>
        )}
        <NetField
          label="Booking Link URL"
          hint="Becomes /book-promoter/your-slug. Lowercase letters, numbers, hyphens only."
          value={slug}
          onChangeText={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="my-company-name"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <NetField label="Welcome Message" value={message} onChangeText={setMessage} multiline placeholder="Hi! We produce amazing events. Fill out the form and we'll be in touch soon." />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Link active</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.purple, false: Colors.border }} />
        </View>
        <AppButton title={link ? 'Save Changes' : 'Create Link'} onPress={save} loading={saving} style={{ backgroundColor: Colors.purple }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  prompt: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  promptText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  urlBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.successLight,
    borderRadius: Radius.md, padding: 12, marginBottom: 14,
  },
  urlText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.successText },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
