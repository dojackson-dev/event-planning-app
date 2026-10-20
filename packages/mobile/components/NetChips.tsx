import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/lib/theme';

type Option = { value: string; label: string };
type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  activeColor?: string;
};

// Horizontal single-select filter chips.
export default function NetChips({ options, value, onChange, activeColor = Colors.primary }: Props) {
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value || 'all'}
            onPress={() => onChange(o.value)}
            style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  text: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  textActive: { color: Colors.textWhite },
});
