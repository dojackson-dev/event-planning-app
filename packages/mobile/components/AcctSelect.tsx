import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/lib/theme';

export type AcctSelectOption = { value: string; label: string; sublabel?: string };

type AcctSelectProps = {
  label: string;
  value: string;
  options: AcctSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string; // when set, adds a "clear" row that selects ''
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
};

// Modal list picker: scales to long lists (events, clients, guests) on a phone.
export default function AcctSelect({
  label, value, options, onChange, placeholder = 'Select…', emptyLabel, required, disabled, searchable = true,
}: AcctSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => { setOpen(false); setQuery(''); };
  const pick = (v: string) => { onChange(v); close(); };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <TouchableOpacity
        style={[styles.box, disabled && styles.disabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
      >
        <Text style={[styles.boxText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={close} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {searchable && options.length > 8 && (
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={o => o.value}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={emptyLabel ? (
                <TouchableOpacity style={styles.row} onPress={() => pick('')}>
                  <Text style={styles.rowText}>{emptyLabel}</Text>
                </TouchableOpacity>
              ) : null}
              ListEmptyComponent={<Text style={styles.none}>No options available</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => pick(item.value)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowText, item.value === value && styles.rowTextActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.sublabel ? <Text style={styles.rowSub} numberOfLines={1}>{item.sublabel}</Text> : null}
                  </View>
                  {item.value === value && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  box: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  },
  disabled: { opacity: 0.5 },
  boxText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '75%', paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  search: { margin: 12, backgroundColor: Colors.background, borderRadius: Radius.md, padding: 10, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowText: { fontSize: 15, color: Colors.textPrimary },
  rowTextActive: { fontWeight: '700', color: Colors.primary },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  none: { padding: 24, textAlign: 'center', color: Colors.textMuted },
});
