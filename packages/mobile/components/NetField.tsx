import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius } from '@/lib/theme';

type Props = TextInputProps & { label: string; hint?: string };

export default function NetField({ label, hint, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, rest.multiline && styles.multiline, style]}
        {...rest}
      />
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
