import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface ArtistDetail {
  id: string;
  artist_name: string;
  stage_name: string | null;
  artist_type: string;
  genres: string[];
  location: string | null;
  description: string | null;
  performance_fee_min: number | null;
  performance_fee_max: number | null;
  travel_availability: string | null;
  profile_image_url: string | null;
  available_for_booking: boolean;
}

function feeLabel(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `$${min.toLocaleString()} \u2013 $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  return null;
}

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
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
      const data = await apiRequest<ArtistDetail>(`/artists/${id}`);
      setArtist(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load artist');
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
    if (!artist) return;
    if (!eventName.trim() || !clientName.trim() || !clientEmail.trim()) {
      Alert.alert('Missing information', 'Event name, client name, and client email are required.');
      return;
    }
    setSubmitting(true);
    try {
      const displayName = artist.stage_name || artist.artist_name;
      const booking = await apiRequest<{ id: string }>('/promoter-bookings', {
        method: 'POST',
        body: {
          event_name: eventName.trim(),
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim() || undefined,
          event_date: eventDate.trim() || undefined,
          venue_name: venueName.trim() || undefined,
          notes: notes.trim() || undefined,
          artist_account_id: artist.id,
          artist_name: displayName,
        },
      });
      Alert.alert('Booking created', `Your booking request for ${displayName} was created.`, [
        {
          text: 'View Booking',
          onPress: () => router.replace(`/(promoter)/bookings/${booking.id}` as any),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Failed to create booking', e.message || 'Please try again.');
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

  if (error || !artist) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Artist not found'}</Text>
      </View>
    );
  }

  const displayName = artist.stage_name || artist.artist_name;
  const fee = feeLabel(artist.performance_fee_min, artist.performance_fee_max);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={[styles.headerCard, Shadow.md]}>
          <View style={styles.headerRow}>
            {artist.profile_image_url ? (
              <Image source={{ uri: artist.profile_image_url }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="mic" size={28} color={Colors.purple} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.type}>{artist.artist_type}</Text>
              {artist.location && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{artist.location}</Text>
                </View>
              )}
            </View>
          </View>

          {artist.genres?.length > 0 && (
            <View style={styles.genreRow}>
              {artist.genres.map((g) => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {fee && (
            <View style={styles.feeRow}>
              <Ionicons name="cash-outline" size={14} color={Colors.success} />
              <Text style={styles.feeText}>{fee}</Text>
            </View>
          )}

          {artist.travel_availability && (
            <View style={styles.metaRow}>
              <Ionicons name="airplane-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{artist.travel_availability}</Text>
            </View>
          )}

          {artist.available_for_booking === false && (
            <View style={styles.unavailableBanner}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.unavailableBannerText}>Currently marked unavailable for booking</Text>
            </View>
          )}

          {artist.description && (
            <Text style={styles.description}>{artist.description}</Text>
          )}
        </View>

        {/* Booking form */}
        <View style={[styles.formCard, Shadow.sm]}>
          <Text style={styles.formTitle}>Book This Artist</Text>

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            value={eventName}
            onChangeText={setEventName}
            placeholder="e.g. Summer Block Party"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Client Name *</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Your name or company"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Client Email *</Text>
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
            placeholder="+1 555 000 0000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Event Date</Text>
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

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else the artist should know..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Send Booking Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: Radius.lg },
  avatarPlaceholder: { backgroundColor: Colors.purpleLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  type: { fontSize: 13, color: Colors.purple, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: Colors.textMuted },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genreChip: { backgroundColor: Colors.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  genreText: { fontSize: 11, color: Colors.purple, fontWeight: '600' },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  feeText: { fontSize: 13, color: Colors.success, fontWeight: '700' },
  unavailableBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.borderLight, borderRadius: Radius.md, padding: 8,
  },
  unavailableBannerText: { fontSize: 12, color: Colors.textMuted },
  description: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 4,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  submitBtn: {
    marginTop: 18,
    backgroundColor: Colors.purple,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
