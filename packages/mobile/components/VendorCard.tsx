import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vendor } from '@/types/vendor';
import { Colors, Radius, Shadow } from '@/lib/theme';

type VendorCardProps = {
  vendor: Vendor;
  onPress: () => void;
  rating?: number | null;
  reviewCount?: number | null;
  verified?: boolean;
  rate?: string | null;
};

export default function VendorCard({ vendor, onPress, rating, reviewCount, verified, rate }: VendorCardProps) {
  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.icon}>
        <Ionicons name="storefront" size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{vendor.name}</Text>
          {verified && <Ionicons name="checkmark-circle" size={14} color={Colors.success} />}
        </View>
        <Text style={styles.category}>{(vendor.category || '').replace(/_/g, ' ')}</Text>
        {(vendor.city || vendor.state) && (
          <Text style={styles.location}>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</Text>
        )}
        {(!!rating || !!rate) && (
          <View style={styles.nameRow}>
            {!!rating && (
              <>
                <Ionicons name="star" size={12} color={Colors.warning} />
                <Text style={styles.meta}>
                  {Number(rating).toFixed(1)}{reviewCount ? ` (${reviewCount})` : ''}
                </Text>
              </>
            )}
            {!!rate && <Text style={styles.rate}>{rate}</Text>}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textSecondary, marginRight: 6 },
  rate: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  category: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  location: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
