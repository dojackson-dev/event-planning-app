import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

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
}

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<VendorDetail>(`/vendors/${id}`);
      setVendor(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!eventName.trim() || !eventDate.trim()) {
      Alert.alert('Missing info', 'Please enter an event name and event date (YYYY-MM-DD).');
      return;
    }
    setSubmitting(true);
    try {
      // Confirmed camelCase body shape from existing frontend caller
      // (packages/frontend .../events/[id]/manage/page.tsx handleBookVendorSubmit):
      // { vendorAccountId, eventId?, eventName, eventDate, venueName?, notes?, agreedAmount?, depositAmount? }
      await apiRequest('/vendors/bookings', {
        method: 'POST',
        body: {
          vendorAccountId: id,
          eventName: eventName.trim(),
          eventDate: eventDate.trim(),
          notes: notes.trim() || undefined,
        },
      });
      Alert.alert(
        'Request sent',
        'Your booking request has been sent to the vendor.',
        [
          { text: 'View My Bookings', onPress: () => router.replace('/(tabs)/vendors/bookings' as any) },
          { text: 'OK' },
        ]
      );
      setEventName('');
      setEventDate('');
      setNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Vendor not found.'}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: vendor.business_name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.headerCard, Shadow.md]}>
          <View style={styles.iconWrap}>
            <Ionicons name="storefront" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.name}>{vendor.business_name}</Text>
          <Text style={styles.category}>{vendor.category}</Text>
          {(vendor.city || vendor.state) && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.location}>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</Text>
            </View>
          )}
          {vendor.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {vendor.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <View style={[styles.card, Shadow.sm]}>
              <Text style={styles.bio}>{vendor.bio}</Text>
            </View>
          </View>
        )}

        {(vendor.hourly_rate != null || vendor.flat_rate != null || vendor.rate_description) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pricing</Text>
            <View style={[styles.card, Shadow.sm]}>
              {vendor.hourly_rate != null && (
                <Text style={styles.infoText}>Hourly: ${vendor.hourly_rate}/hr</Text>
              )}
              {vendor.flat_rate != null && (
                <Text style={styles.infoText}>Flat rate: ${vendor.flat_rate}</Text>
              )}
              {vendor.rate_description && (
                <Text style={styles.infoText}>{vendor.rate_description}</Text>
              )}
            </View>
          </View>
        )}

        {(vendor.phone || vendor.email || vendor.website) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Contact</Text>
            <View style={[styles.card, Shadow.sm]}>
              {vendor.phone && <Text style={styles.infoText}>{vendor.phone}</Text>}
              {vendor.email && <Text style={styles.infoText}>{vendor.email}</Text>}
              {vendor.website && <Text style={styles.infoText}>{vendor.website}</Text>}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Request Booking</Text>
          <View style={[styles.card, Shadow.sm]}>
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
              placeholder="Event name"
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="Event date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.multiline, { marginTop: 8 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Request Booking</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background, gap: 12, padding: 24,
  },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20,
    alignItems: 'center', marginBottom: 20,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  category: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: 4, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  location: { fontSize: 13, color: Colors.textMuted },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10,
    backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.successText },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16 },
  bio: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  infoText: { fontSize: 14, color: Colors.textPrimary, marginBottom: 4 },

  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { height: 80, textAlignVertical: 'top' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
