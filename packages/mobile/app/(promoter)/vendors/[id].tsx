import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

// Shape returned by GET /vendors/:id (vendor_accounts row, snake_case).
interface VendorDetail {
  id: string;
  business_name: string;
  category: string;
  bio?: string;
  city?: string;
  state?: string;
  profile_image_url?: string;
  is_verified?: boolean;
  hourly_rate?: number;
  flat_rate?: number;
  rate_description?: string;
  phone?: string;
  email?: string;
  website?: string;
}

function rateLabel(hourly?: number, flat?: number): string | null {
  if (hourly != null) return `$${hourly}/hr`;
  if (flat != null) return `$${flat} flat rate`;
  return null;
}

export default function PromoterVendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventName, setEventName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await apiRequest<VendorDetail>(`/vendors/${id}`);
      setVendor(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load vendor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async () => {
    if (!vendor) return;
    if (!eventName.trim() || !eventDate.trim()) {
      Alert.alert('Missing information', 'Event name and event date are required.');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await apiRequest<{ id: string }>('/vendors/bookings', {
        method: 'POST',
        body: {
          vendorAccountId: vendor.id,
          eventName: eventName.trim(),
          eventDate: eventDate.trim(),
          venueName: venueName.trim() || undefined,
          notes: notes.trim() || undefined,
          clientName: clientName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
        },
      });
      Alert.alert('Request sent', `Your booking request for ${vendor.business_name} was sent.`, [
        {
          text: 'View My Bookings',
          onPress: () => router.replace('/(promoter)/vendor-bookings' as any),
        },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Failed to send request', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Vendor not found'}</Text>
      </View>
    );
  }

  const rate = rateLabel(vendor.hourly_rate, vendor.flat_rate);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, Shadow.md]}>
          <View style={styles.headerRow}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="storefront" size={28} color={Colors.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{vendor.business_name}</Text>
              <Text style={styles.type}>{vendor.category?.replace(/_/g, ' ')}</Text>
              {(vendor.city || vendor.state) && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</Text>
                </View>
              )}
            </View>
          </View>

          {rate && (
            <View style={styles.feeRow}>
              <Ionicons name="cash-outline" size={14} color={Colors.success} />
              <Text style={styles.feeText}>{rate}</Text>
            </View>
          )}

          {vendor.is_verified && (
            <View style={styles.verifiedBanner}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}

          {vendor.bio && <Text style={styles.description}>{vendor.bio}</Text>}
        </View>

        <View style={[styles.formCard, Shadow.sm]}>
          <Text style={styles.formTitle}>Request Booking</Text>

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            value={eventName}
            onChangeText={setEventName}
            placeholder="e.g. Summer Block Party"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Event Date *</Text>
          <TextInput
            style={styles.input}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Venue</Text>
          <TextInput
            style={styles.input}
            value={venueName}
            onChangeText={setVenueName}
            placeholder="Venue name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Client / Company Name</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Your name or company"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Client Email</Text>
          <TextInput
            style={styles.input}
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Client Phone</Text>
          <TextInput
            style={styles.input}
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="(555) 555-5555"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything the vendor should know"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

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
    </KeyboardAvoidingView>
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

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.purpleLight,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  type: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  feeText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  description: { fontSize: 14, color: Colors.textSecondary, marginTop: 12, lineHeight: 20 },

  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16 },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.purple, borderRadius: Radius.lg, paddingVertical: 14, marginTop: 18,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
