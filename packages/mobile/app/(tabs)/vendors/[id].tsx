import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import NetField from '@/components/NetField';
import DateTimeField from '@/components/DateTimeField';
import NetChips from '@/components/NetChips';
import { fmtDate, fmtMoney, titleCase, toList } from '@/components/netFormat';

// Shape returned by GET /vendors/:id (vendor_accounts row, snake_case).
interface VendorDetail {
  id: string;
  business_name: string;
  category: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  profile_image_url?: string;
  is_verified?: boolean;
  hourly_rate?: number;
  flat_rate?: number;
  rate_description?: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
}

interface Review { id: string; rating: number; review_text?: string | null; created_at: string }

interface OwnerEvent {
  id: string;
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  location?: string;
  status?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;
const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(Math.max(0, 5 - Math.round(n)));

const emptyForm = {
  eventId: '', eventName: '', eventDate: '', startTime: '', endTime: '',
  venueName: '', venueAddress: '', notes: '', agreedAmount: '', depositAmount: '',
};

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [events, setEvents] = useState<OwnerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [v, r, e] = await Promise.allSettled([
        apiRequest<VendorDetail>(`/vendors/${id}`),
        apiRequest<any>(`/vendors/${id}/reviews`),
        apiRequest<any>('/events'),
      ]);
      if (v.status === 'rejected') throw v.reason;
      setVendor(v.value);
      setReviews(r.status === 'fulfilled' ? toList<Review>(r.value, 'reviews') : []);
      const today = new Date().toISOString().slice(0, 10);
      setEvents(
        e.status === 'fulfilled'
          ? toList<OwnerEvent>(e.value, 'events')
              .filter((ev) => ev.status !== 'cancelled' && (ev.date || '').slice(0, 10) >= today)
              .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
              .slice(0, 12)
          : [],
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor.');
    } finally {
      setLoading(false);
    }
  };

  const pickEvent = (eventId: string) => {
    const ev = events.find((x) => x.id === eventId);
    if (!ev || form.eventId === eventId) {
      setForm((p) => ({ ...p, eventId: '' }));
      return;
    }
    setForm((p) => ({
      ...p,
      eventId,
      eventName: ev.name || p.eventName,
      eventDate: ev.date ? ev.date.slice(0, 10) : p.eventDate,
      startTime: (ev.startTime || '').slice(0, 5),
      endTime: (ev.endTime || '').slice(0, 5),
      venueName: ev.venue || p.venueName,
      venueAddress: ev.location || p.venueAddress,
    }));
  };

  const handleSubmit = async () => {
    if (!form.eventName.trim() || !form.eventDate.trim()) {
      Alert.alert('Missing info', 'Please enter an event name and event date.');
      return;
    }
    if (!DATE_RE.test(form.eventDate.trim())) {
      Alert.alert('Invalid date', 'Please select a valid event date.');
      return;
    }
    for (const t of [form.startTime, form.endTime]) {
      if (t.trim() && !TIME_RE.test(t.trim())) {
        Alert.alert('Invalid time', 'Please select a valid time.');
        return;
      }
    }
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    const amount = (s: string) => (s.trim() && Number.isFinite(parseFloat(s)) ? parseFloat(s) : undefined);
    setSubmitting(true);
    try {
      // Body shape matches web dashboard/vendors/[id] -> POST /vendors/bookings (CreateVendorBookingDto).
      await apiRequest('/vendors/bookings', {
        method: 'POST',
        body: {
          vendorAccountId: id,
          eventId: form.eventId && !form.eventId.startsWith('intake-') ? form.eventId : undefined,
          eventName: form.eventName.trim(),
          eventDate: form.eventDate.trim(),
          startTime: opt(form.startTime),
          endTime: opt(form.endTime),
          venueName: opt(form.venueName),
          venueAddress: opt(form.venueAddress),
          notes: opt(form.notes),
          agreedAmount: amount(form.agreedAmount),
          depositAmount: amount(form.depositAmount),
        },
      });
      Alert.alert('Request sent', 'Your booking request has been sent to the vendor.', [
        { text: 'View My Bookings', onPress: () => router.replace('/(tabs)/vendors/bookings' as any) },
        { text: 'OK' },
      ]);
      setForm(emptyForm);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading vendor..." />;

  if (error || !vendor) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Vendor not found.'}</Text>
        <AppButton title="Retry" variant="outline" onPress={load} />
      </View>
    );
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open this link.'));
  const site = vendor.website ? (/^https?:\/\//i.test(vendor.website) ? vendor.website : `https://${vendor.website}`) : '';
  const insta = vendor.instagram ? `https://instagram.com/${vendor.instagram.replace(/^@/, '')}` : '';

  return (
    <>
      <Stack.Screen options={{ title: vendor.business_name }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.headerCard, Shadow.md]}>
            <View style={styles.iconWrap}>
              <Ionicons name="storefront" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.name}>{vendor.business_name}</Text>
            <Text style={styles.category}>{titleCase(vendor.category)}</Text>
            {(vendor.city || vendor.state) && (
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.location}>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</Text>
              </View>
            )}
            {!!avg && (
              <View style={styles.row}>
                <Text style={styles.starsText}>{stars(avg)}</Text>
                <Text style={styles.location}>{avg.toFixed(1)} ({reviews.length})</Text>
              </View>
            )}
            {vendor.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {!!vendor.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              <View style={[styles.card, Shadow.sm]}><Text style={styles.bio}>{vendor.bio}</Text></View>
            </View>
          )}

          {(vendor.hourly_rate != null || vendor.flat_rate != null || !!vendor.rate_description) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pricing</Text>
              <View style={[styles.card, Shadow.sm]}>
                {vendor.hourly_rate != null && <Text style={styles.infoText}>Hourly: {fmtMoney(vendor.hourly_rate, 0)}/hr</Text>}
                {vendor.flat_rate != null && <Text style={styles.infoText}>Flat rate: {fmtMoney(vendor.flat_rate, 0)}</Text>}
                {!!vendor.rate_description && <Text style={styles.infoText}>{vendor.rate_description}</Text>}
              </View>
            </View>
          )}

          {(vendor.phone || vendor.email || vendor.website || vendor.instagram) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Contact</Text>
              <View style={[styles.card, Shadow.sm]}>
                {!!vendor.phone && (
                  <TouchableOpacity style={styles.contactRow} onPress={() => open(`tel:${vendor.phone}`)}>
                    <Ionicons name="call-outline" size={16} color={Colors.primary} /><Text style={styles.link}>{vendor.phone}</Text>
                  </TouchableOpacity>
                )}
                {!!vendor.email && (
                  <TouchableOpacity style={styles.contactRow} onPress={() => open(`mailto:${vendor.email}`)}>
                    <Ionicons name="mail-outline" size={16} color={Colors.primary} /><Text style={styles.link}>{vendor.email}</Text>
                  </TouchableOpacity>
                )}
                {!!site && (
                  <TouchableOpacity style={styles.contactRow} onPress={() => open(site)}>
                    <Ionicons name="globe-outline" size={16} color={Colors.primary} /><Text style={styles.link} numberOfLines={1}>{vendor.website}</Text>
                  </TouchableOpacity>
                )}
                {!!insta && (
                  <TouchableOpacity style={styles.contactRow} onPress={() => open(insta)}>
                    <Ionicons name="logo-instagram" size={16} color={Colors.primary} /><Text style={styles.link}>{vendor.instagram}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Request Booking</Text>
            <View style={[styles.card, Shadow.sm]}>
              {events.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Pick one of your upcoming events (optional)</Text>
                  <View style={styles.chipBleed}>
                    <NetChips
                      value={form.eventId}
                      onChange={pickEvent}
                      options={events.map((e) => ({ value: e.id, label: `${e.name || 'Event'}${e.date ? ` · ${fmtDate(e.date, false)}` : ''}` }))}
                    />
                  </View>
                </>
              )}
              <NetField label="Event name *" value={form.eventName} onChangeText={set('eventName')} placeholder="Event name" />
              <DateTimeField label="Event date" mode="date" value={form.eventDate} onChange={set('eventDate')} required />
              <View style={styles.formRow}>
                <View style={styles.half}><DateTimeField label="Start" mode="time" value={form.startTime} onChange={set('startTime')} clearable /></View>
                <View style={styles.half}><DateTimeField label="End" mode="time" value={form.endTime} onChange={set('endTime')} clearable /></View>
              </View>
              <NetField label="Venue" value={form.venueName} onChangeText={set('venueName')} />
              <NetField label="Venue address" value={form.venueAddress} onChangeText={set('venueAddress')} />
              <View style={styles.formRow}>
                <View style={styles.half}><NetField label="Agreed ($)" value={form.agreedAmount} onChangeText={set('agreedAmount')} keyboardType="decimal-pad" placeholder="0.00" /></View>
                <View style={styles.half}><NetField label="Deposit ($)" value={form.depositAmount} onChangeText={set('depositAmount')} keyboardType="decimal-pad" placeholder="0.00" /></View>
              </View>
              <NetField label="Notes" value={form.notes} onChangeText={set('notes')} multiline placeholder="Anything the vendor should know" />
              <AppButton title="Request Booking" onPress={handleSubmit} loading={submitting} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Reviews ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <View style={[styles.card, Shadow.sm]}><Text style={styles.bio}>No reviews yet.</Text></View>
            ) : (
              reviews.slice(0, 10).map((r) => (
                <View key={r.id} style={[styles.card, Shadow.sm, styles.reviewCard]}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.starsText}>{stars(r.rating)}</Text>
                    <Text style={styles.location}>{fmtDate(r.created_at)}</Text>
                  </View>
                  {!!r.review_text && <Text style={styles.bio}>“{r.review_text}”</Text>}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12, padding: 24 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, alignItems: 'center', marginBottom: 20 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  category: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  location: { fontSize: 13, color: Colors.textMuted },
  starsText: { fontSize: 14, color: Colors.warning },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10,
    backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.successText },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16 },
  reviewCard: { marginBottom: 8, gap: 6 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bio: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  infoText: { fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  link: { flex: 1, fontSize: 14, color: Colors.primary },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipBleed: { marginHorizontal: -16, marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
