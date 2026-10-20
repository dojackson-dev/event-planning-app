import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/lib/theme';

type Props = {
  label: string;
  /** 'YYYY-MM-DD' for date mode, 'HH:MM' (24h) for time mode; '' when unset. */
  value: string;
  onChange: (value: string) => void;
  mode: 'date' | 'time';
  required?: boolean;
  error?: string;
  placeholder?: string;
  /** Show a clear button for optional fields. */
  clearable?: boolean;
  /** 'YYYY-MM-DD' lower bound (date mode only). */
  minimumDate?: string;
  disabled?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

function toPickerDate(value: string, mode: 'date' | 'time'): Date {
  const d = new Date();
  if (mode === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    d.setHours(12, 0, 0, 0);
    return d;
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  else d.setHours(10, 0, 0, 0);
  return d;
}

function fromPickerDate(d: Date, mode: 'date' | 'time'): string {
  return mode === 'date'
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function display(value: string, mode: 'date' | 'time'): string {
  if (!value) return '';
  const d = toPickerDate(value, mode);
  return mode === 'date'
    ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Native date/time picker that keeps the same string contract as the old text
// inputs, so existing validation and request bodies keep working unchanged.
export default function DateTimeField({
  label, value, onChange, mode, required, error, placeholder, clearable, minimumDate, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toPickerDate(value, mode));
  const min = minimumDate ? toPickerDate(minimumDate, 'date') : undefined;

  const openPicker = () => {
    if (disabled) return;
    const current = toPickerDate(value, mode);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: false,
        minimumDate: min,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChange(fromPickerDate(d, mode));
        },
      });
      return;
    }
    setDraft(current);
    setOpen(true);
  };

  const confirm = () => {
    onChange(fromPickerDate(draft, mode));
    setOpen(false);
  };

  const text = display(value, mode);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <TouchableOpacity
        style={[styles.input, !!error && styles.inputError, disabled && { opacity: 0.5 }]}
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text || 'not set'}`}
      >
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={Colors.textMuted} />
        <Text style={[styles.value, !text && styles.placeholder]} numberOfLines={1}>
          {text || placeholder || (mode === 'date' ? 'Select date' : 'Select time')}
        </Text>
        {clearable && !!value && !disabled && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{label}</Text>
                <TouchableOpacity onPress={confirm} hitSlop={10}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                minimumDate={min}
                themeVariant="light"
                onChange={(_e, d) => d && setDraft(d)}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11,
  },
  inputError: { borderColor: Colors.error },
  value: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  placeholder: { color: Colors.textMuted },
  error: { fontSize: 12, color: Colors.error, marginTop: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.textSecondary },
  done: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
