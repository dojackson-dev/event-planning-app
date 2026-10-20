import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius } from '@/lib/theme';

type AcctFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  required?: boolean;
  disabledField?: boolean;
};

export default function AcctField({ label, hint, required, disabledField, style, ...inputProps }: AcctFieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={Colors.textMuted}
        {...inputProps}
        editable={!disabledField && inputProps.editable !== false}
        style={[styles.input, inputProps.multiline && styles.multiline, disabledField && styles.disabled, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  disabled: { opacity: 0.6 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
