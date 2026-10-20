import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius } from '@/lib/theme';

type Props = TextInputProps & { label: string; error?: string; required?: boolean };

export default function EvtField({ label, error, required, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        {...rest}
        style={[styles.input, rest.multiline && styles.multiline, !!error && styles.inputError, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.error },
  error: { fontSize: 12, color: Colors.error, marginTop: 3 },
});
