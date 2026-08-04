import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/lib/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
};

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <Text style={styles.action} onPress={action.onPress}>
          {action.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  left: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
