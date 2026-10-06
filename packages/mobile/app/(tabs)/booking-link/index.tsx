import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch, Share,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

const FRONTEND_URL = 'https://eventecos.com';

interface BookingLink {
  id: string;
  slug: string;
  short_code: string | null;
  is_active: boolean;
  custom_message: string | null;
}

interface BookingRequest {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  event_name: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  quoted_amount: number | null;
  sms_opt_in: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'Pending',   bg: '#FEF3C7', text: '#92400E' },
  confirmed: { label: 'Confirmed', bg: '#D1FAE5', text: '#065F46' },
  declined:  { label: 'Declined',  bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { label: 'Cancelled', bg: '#F3F4F6', text: '#6B7280' },
};

const SLUG_REGEX = /^[a-z0-9-]{3,60}$/;

export default function BookingLinkScreen() {
  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [customMessage, setCustomMessage] = useState('');

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadLink();
    loadRequests();
  }, []));

  const loadLink = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<BookingLink | null>('/owner/booking-links/mine');
      if (data) {
        setLink(data);
        setSlug(data.slug);
        setIsActive(data.is_active);
        setCustomMessage(data.custom_message ?? '');
      }
    } catch {
      // no link yet — leave form empty
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await apiRequest<BookingRequest[]>('/owner/booking-links/requests');
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
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
      const data = await apiRequest<BookingLink>('/owner/booking-links', {
        method: 'POST',
        body: { slug, isActive, customMessage: customMessage || undefined },
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

  const handleRespond = async (id: string, status: 'confirmed' | 'declined') => {
    setRespondingId(id);
    try {
      const updated = await apiRequest<BookingRequest>(`/owner/booking-links/requests/${id}`, {
        method: 'PUT',
        body: { status },
      });
      setRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update request. Please try again.');
    } finally {
      setRespondingId(null);
    }
  };

  const bookingUrl = link ? `${FRONTEND_URL}/book-venue/${link.slug}` : '';
  const shortUrl = link?.short_code ? `${FRONTEND_URL}/v/${link.short_code}` : '';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Settings card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Venue Booking Link</Text>

        {!link && (
          <View style={styles.emptyPrompt}>
            <Ionicons name="link-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.emptyPromptText}>Set up your booking link so clients can request your venue online.</Text>
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
          <Text style={styles.hint}>Becomes /book-venue/your-slug. Lowercase letters, numbers, hyphens only.</Text>
          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={v => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="my-venue-name"
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
            placeholder="Welcome! Our venue is available for private events. Fill out the form and we'll be in touch."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
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

      {/* Requests */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Requests</Text>

        {requestsLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyPrompt}>
            <Ionicons name="calendar-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.emptyPromptText}>No booking requests yet. Share your booking link so clients can reach out.</Text>
          </View>
        ) : (
          requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
            const isPending = req.status === 'pending';
            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName}>{req.client_name}</Text>
                    {req.event_name && <Text style={styles.requestSub}>{req.event_name}</Text>}
                  </View>
                  <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.pillText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                </View>

                <View style={styles.requestMeta}>
                  <Ionicons name="mail-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.requestMetaText}>{req.client_email}</Text>
                </View>
                {req.client_phone && (
                  <View style={styles.requestMeta}>
                    <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.requestMetaText}>{req.client_phone}</Text>
                  </View>
                )}
                {req.event_date && (
                  <View style={styles.requestMeta}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.requestMetaText}>
                      {new Date(req.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                )}
                {req.notes && <Text style={styles.requestNotes}>{req.notes}</Text>}

                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.confirmBtn]}
                      onPress={() => handleRespond(req.id, 'confirmed')}
                      disabled={respondingId === req.id}
                    >
                      {respondingId === req.id
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <><Ionicons name="checkmark" size={15} color="#FFF" /><Text style={styles.confirmBtnText}>Accept</Text></>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn]}
                      onPress={() => handleRespond(req.id, 'declined')}
                      disabled={respondingId === req.id}
                    >
                      <Ionicons name="close" size={15} color={Colors.error} />
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },

  emptyPrompt: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyPromptText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 12 },

  urlBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  urlRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  urlText: { fontSize: 12, color: Colors.textPrimary, flex: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  shareBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  section: { marginTop: 16 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  settingLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  requestCard: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingVertical: 14 },
  requestHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  requestName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  requestSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },

  requestMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  requestMetaText: { fontSize: 13, color: Colors.textSecondary },
  requestNotes: { fontSize: 13, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: Radius.md },
  confirmBtn: { backgroundColor: Colors.primary },
  confirmBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  declineBtn: { borderWidth: 1, borderColor: Colors.error },
  declineBtnText: { color: Colors.error, fontSize: 13, fontWeight: '700' },
});
