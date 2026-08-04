import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vendor } from '@/types/vendor';
import { Colors, Radius, Shadow } from '@/lib/theme';

type VendorCardProps = { vendor: Vendor; onPress: () => void };

export default function VendorCard({ vendor, onPress }: VendorCardProps) {
  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.icon}>
        <Ionicons name="storefront" size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{vendor.name}</Text>
        <Text style={styles.category}>{vendor.category}</Text>
        {(vendor.city || vendor.state) && (
          <Text style={styles.location}>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</Text>
        )}
      </View>
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
  icon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  category: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  location: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
