import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/lib/theme';

export interface EvtPickerOption {
  value: string;
  label: string;
  sub?: string;
}

type Props = {
  label: string;
  value: string;
  options: EvtPickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  searchable?: boolean;
};

export default function EvtPicker({ label, value, options, onChange, placeholder = 'Select…', emptyLabel = 'None', searchable }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub || '').toLowerCase().includes(q)) : options;

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.inputText, !selected && { color: Colors.textMuted }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          {searchable ? (
            <TextInput
              style={styles.search}
              placeholder="Search…"
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <TouchableOpacity style={styles.row} onPress={() => pick('')}>
                <Text style={[styles.rowText, { color: Colors.textSecondary }]}>{emptyLabel}</Text>
                {!value ? <Ionicons name="checkmark" size={18} color={Colors.primary} /> : null}
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => pick(item.value)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{item.label}</Text>
                  {item.sub ? <Text style={styles.rowSub}>{item.sub}</Text> : null}
                </View>
                {item.value === value ? <Ionicons name="checkmark" size={18} color={Colors.primary} /> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 12,
  },
  inputText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%',
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  search: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: Colors.textPrimary, marginBottom: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  rowText: { fontSize: 15, color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
