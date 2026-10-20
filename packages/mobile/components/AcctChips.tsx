import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/lib/theme';

export type AcctChipOption<T extends string> = { value: T; label: string };

type AcctChipsProps<T extends string> = {
  options: AcctChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Horizontally scrollable single-select chips (filters, type pickers).
export default function AcctChips<T extends string>({ options, value, onChange }: AcctChipsProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryText, fontWeight: '700' },
});
