import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Venue } from '@/types/venue';
import { Colors, Radius, Shadow } from '@/lib/theme';

type VenueCardProps = { venue: Venue; onPress: () => void };

export default function VenueCard({ venue, onPress }: VenueCardProps) {
  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.9}>
      {venue.imageUrl ? (
        <Image source={{ uri: venue.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="business" size={28} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
        {(venue.city || venue.state) && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.location}>{[venue.city, venue.state].filter(Boolean).join(', ')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    width: 160,
    marginRight: 12,
  },
  image: { width: '100%', height: 100 },
  placeholder: { backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  info: { padding: 10 },
  name: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 12, color: Colors.textSecondary },
});
