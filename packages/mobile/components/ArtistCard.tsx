import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';

export type Artist = {
  id: string;
  artist_name: string;
  stage_name?: string | null;
  artist_type: string;
  genres?: string[] | null;
  location?: string | null;
  profile_image_url?: string | null;
  performance_fee_min?: number | null;
  performance_fee_max?: number | null;
  available_for_booking?: boolean;
};

type ArtistCardProps = { artist: Artist; onPress: () => void };

function feeLabel(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `$${min.toLocaleString()} \u2013 $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  return null;
}

export default function ArtistCard({ artist, onPress }: ArtistCardProps) {
  const displayName = artist.stage_name || artist.artist_name;
  const fee = feeLabel(artist.performance_fee_min, artist.performance_fee_max);
  const genreLabel = artist.genres && artist.genres.length > 0 ? artist.genres.slice(0, 2).join(', ') : '';

  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.9}>
      {artist.profile_image_url ? (
        <Image source={{ uri: artist.profile_image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="mic" size={22} color={Colors.purple} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.type} numberOfLines={1}>
          {artist.artist_type}{genreLabel ? ` \u00b7 ${genreLabel}` : ''}
        </Text>
        {artist.location && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.location} numberOfLines={1}>{artist.location}</Text>
          </View>
        )}
        {fee && <Text style={styles.fee}>{fee}</Text>}
      </View>
      {artist.available_for_booking === false && (
        <View style={styles.unavailableBadge}>
          <Text style={styles.unavailableText}>Unavailable</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
  },
  placeholder: {
    backgroundColor: Colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  type: { fontSize: 12, color: Colors.purple, fontWeight: '600', textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 12, color: Colors.textMuted },
  fee: { fontSize: 12, color: Colors.success, fontWeight: '600', marginTop: 2 },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  unavailableText: { fontSize: 9, fontWeight: '600', color: Colors.textMuted },
});
