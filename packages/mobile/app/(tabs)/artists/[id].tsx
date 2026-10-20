import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Linking, TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import { fmtMoney, titleCase } from '@/components/netFormat';

// GET /artists/:id (public artist profile). Same fields as web dashboard/artists/[id].
interface ArtistDetail {
  id: string;
  artist_name: string;
  stage_name?: string | null;
  artist_type?: string;
  genres?: string[] | null;
  location?: string | null;
  description?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  performance_fee_min?: number | null;
  performance_fee_max?: number | null;
  set_length_minutes?: number | null;
  travel_availability?: string | null;
  equipment_needs?: string | null;
  hospitality_requirements?: string | null;
  agency?: string | null;
  booking_contact_name?: string | null;
  booking_email?: string | null;
  booking_phone?: string | null;
  epk_url?: string | null;
  instagram?: string | null;
  spotify?: string | null;
  website?: string | null;
  youtube?: string | null;
  available_for_booking?: boolean;
}

const withScheme = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setArtist(await apiRequest<ArtistDetail>(`/artists/${id}`));
    } catch (err: any) {
      setError(err.message || 'Failed to load artist.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open this link.'));

  if (loading) return <LoadingState message="Loading artist..." />;
  if (error || !artist) {
    return (
      <View style={styles.centered}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load artist" message={error || 'Artist not found.'} />
        <AppButton title="Retry" variant="outline" onPress={load} />
      </View>
    );
  }

  const name = artist.stage_name || artist.artist_name;
  const fee =
    artist.performance_fee_min && artist.performance_fee_max
      ? `${fmtMoney(artist.performance_fee_min, 0)} – ${fmtMoney(artist.performance_fee_max, 0)}`
      : artist.performance_fee_min
        ? `From ${fmtMoney(artist.performance_fee_min, 0)}`
        : artist.performance_fee_max
          ? `Up to ${fmtMoney(artist.performance_fee_max, 0)}`
          : null;

  const links: { icon: keyof typeof Ionicons.glyphMap; label: string; url: string }[] = [];
  if (artist.website) links.push({ icon: 'globe-outline', label: 'Website', url: withScheme(artist.website) });
  if (artist.instagram) links.push({ icon: 'logo-instagram', label: 'Instagram', url: /^https?:/i.test(artist.instagram) ? artist.instagram : `https://instagram.com/${artist.instagram.replace(/^@/, '')}` });
  if (artist.spotify) links.push({ icon: 'musical-notes-outline', label: 'Spotify', url: withScheme(artist.spotify) });
  if (artist.youtube) links.push({ icon: 'logo-youtube', label: 'YouTube', url: withScheme(artist.youtube) });
  if (artist.epk_url) links.push({ icon: 'document-text-outline', label: 'Press Kit (EPK)', url: withScheme(artist.epk_url) });

  const detail = (label: string, value?: string | null) =>
    value ? (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    ) : null;

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.hero, Shadow.md]}>
          {artist.profile_image_url ? (
            <Image source={{ uri: artist.profile_image_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}><Ionicons name="mic" size={32} color={Colors.purple} /></View>
          )}
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.type}>{titleCase(artist.artist_type)}</Text>
          {!!artist.location && (
            <View style={styles.row}><Ionicons name="location-outline" size={14} color={Colors.textMuted} /><Text style={styles.muted}>{artist.location}</Text></View>
          )}
          <View style={[styles.avail, { backgroundColor: artist.available_for_booking === false ? Colors.borderLight : Colors.successLight }]}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: artist.available_for_booking === false ? Colors.textSecondary : Colors.successText }}>
              {artist.available_for_booking === false ? 'Not available for booking' : 'Available for booking'}
            </Text>
          </View>
          {!!artist.genres?.length && (
            <View style={styles.genres}>
              {artist.genres.map((g) => <View key={g} style={styles.genre}><Text style={styles.genreText}>{g}</Text></View>)}
            </View>
          )}
        </View>

        {!!artist.description && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.heading}>About</Text>
            <Text style={styles.body}>{artist.description}</Text>
          </View>
        )}

        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Performance</Text>
          {detail('Fee range', fee)}
          {detail('Set length', artist.set_length_minutes ? `${artist.set_length_minutes} min` : null)}
          {detail('Travel', artist.travel_availability)}
          {detail('Equipment needs', artist.equipment_needs)}
          {detail('Hospitality', artist.hospitality_requirements)}
          {!fee && !artist.set_length_minutes && !artist.travel_availability && !artist.equipment_needs && !artist.hospitality_requirements && (
            <Text style={styles.muted}>No performance details listed.</Text>
          )}
        </View>

        {(artist.booking_email || artist.booking_phone || artist.booking_contact_name || artist.agency) && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.heading}>Booking Contact</Text>
            {detail('Agency', artist.agency)}
            {detail('Contact', artist.booking_contact_name)}
            {!!artist.booking_phone && (
              <TouchableOpacity style={styles.contact} onPress={() => open(`tel:${artist.booking_phone}`)}>
                <Ionicons name="call-outline" size={16} color={Colors.primary} /><Text style={styles.link}>{artist.booking_phone}</Text>
              </TouchableOpacity>
            )}
            {!!artist.booking_email && (
              <TouchableOpacity style={styles.contact} onPress={() => open(`mailto:${artist.booking_email}`)}>
                <Ionicons name="mail-outline" size={16} color={Colors.primary} /><Text style={styles.link}>{artist.booking_email}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {links.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.heading}>Links</Text>
            {links.map((l) => (
              <TouchableOpacity key={l.label} style={styles.contact} onPress={() => open(l.url)}>
                <Ionicons name={l.icon} size={16} color={Colors.primary} /><Text style={styles.link}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24 },
  hero: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, alignItems: 'center', marginBottom: 12, gap: 4 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 8 },
  avatarPlaceholder: { backgroundColor: Colors.purpleLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  type: { fontSize: 13, fontWeight: '600', color: Colors.purple },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted: { fontSize: 13, color: Colors.textMuted },
  avail: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginTop: 8 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  genre: { backgroundColor: Colors.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  genreText: { fontSize: 12, fontWeight: '600', color: Colors.purpleText },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 12, gap: 8 },
  heading: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 12, color: Colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  link: { fontSize: 14, color: Colors.primary },
});
