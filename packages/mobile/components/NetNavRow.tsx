import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tint?: string;
  tintBg?: string;
  badge?: number;
};

// Dashboard navigation row shared by the vendor/artist/promoter portals.
export default function NetNavRow({
  icon, title, subtitle, onPress, tint = Colors.primary, tintBg = Colors.primaryLight, badge,
}: Props) {
  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconWrap, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 14, marginBottom: 10,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.textWhite },
});
