import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, Share,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

const FRONTEND_URL = 'https://dovenuesuite.com';
const SLUG_REGEX = /^[a-z0-9-]{3,60}$/;

interface BookingLink {
  id: string;
  slug: string;
  short_code: string | null;
  is_active: boolean;
  custom_message: string | null;
  default_deposit_percentage: number | null;
}

export default function VendorBookingLinkScreen() {
  const router = useRouter();
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [depositPct, setDepositPct] = useState('');

  useFocusEffect(useCallback(() => {
    loadLink();
  }, []));

  const loadLink = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<BookingLink | null>('/vendors/booking-links/mine');
      if (data) {
        setLink(data);
        setSlug(data.slug);
        setIsActive(data.is_active);
        setCustomMessage(data.custom_message ?? '');
        setDepositPct(data.default_deposit_percentage != null ? String(data.default_deposit_percentage) : '');
      }
    } catch {
      // no link yet — leave form empty
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!slug.trim()) { Alert.alert('Validation', 'A slug is required.'); return; }
    if (!SLUG_REGEX.test(slug)) {
      Alert.alert('Validation', 'Slug must be 3-60 characters: lowercase letters, numbers, and hyphens only.');
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest<BookingLink>('/vendors/booking-links', {
        method: 'POST',
        body: {
          slug,
          isActive,
          customMessage: customMessage || undefined,
          defaultDepositPercentage: depositPct.trim() !== '' ? Number(depositPct) : undefined,
        },
      });
      setLink(data);
      Alert.alert('Saved', 'Booking link saved!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save booking link.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = (url: string) => {
    Share.share({ message: url }).catch(() => {});
  };

  const bookingUrl = link ? `${FRONTEND_URL}/book/${link.slug}` : '';
  const shortUrl = link?.short_code ? `${FRONTEND_URL}/b/${link.short_code}` : '';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.cardTitle}>Your Booking Link</Text>

        {!link && (
          <View style={styles.emptyPrompt}>
            <Ionicons name="link-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.emptyPromptText}>Set up your booking link so clients can request your services online.</Text>
          </View>
        )}

        {link && link.is_active && bookingUrl && (
          <View style={styles.urlBox}>
            <View style={styles.urlRow}>
              <Ionicons name="globe-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.urlText} numberOfLines={1}>{bookingUrl}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(bookingUrl)}>
              <Ionicons name="share-outline" size={14} color={Colors.primary} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
        {link && link.is_active && shortUrl && (
          <View style={[styles.urlBox, { marginTop: 8 }]}>
            <View style={styles.urlRow}>
              <Ionicons name="link-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.urlText} numberOfLines={1}>{shortUrl}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(shortUrl)}>
              <Ionicons name="share-outline" size={14} color={Colors.primary} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Booking Link URL</Text>
          <Text style={styles.hint}>Becomes /book/your-slug. Lowercase letters, numbers, hyphens only.</Text>
          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={v => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-business-name"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Welcome Message</Text>
          <Text style={styles.hint}>Displayed at the top of your public booking page.</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={customMessage}
            onChangeText={setCustomMessage}
            placeholder="Welcome! Fill out the form below and we'll be in touch."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Default Deposit %</Text>
          <Text style={styles.hint}>Optional. Shown to clients as the expected deposit, e.g. 25.</Text>
          <TextInput
            style={styles.input}
            value={depositPct}
            onChangeText={v => setDepositPct(v.replace(/[^0-9]/g, ''))}
            placeholder="25"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Booking Link Active</Text>
            <Text style={styles.hint}>When inactive, visitors see a "not available" message.</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#FFF" />
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Booking Link</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.navCard, Shadow.sm]}
        onPress={() => router.push('/(vendor)/booking-requests' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.navIconWrap}>
          <Ionicons name="mail-unread-outline" size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle}>Booking Requests</Text>
          <Text style={styles.hint}>Review and respond to requests from this link</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  emptyPrompt: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, marginBottom: 12 },
  emptyPromptText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  urlBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 10,
  },
  urlRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  urlText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '600' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  section: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  hint: { fontSize: 11, color: Colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  navCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14,
  },
  navIconWrap: {
    width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});
