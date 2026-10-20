import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import DateTimeField from '@/components/DateTimeField';
import LoadingState from '@/components/LoadingState';
import { toSnake, num, fmtMoney, errMsg, finStyles as f, ErrorState, Field, Section } from '@/components/FinUI';

type DiscountType = 'none' | 'percentage' | 'fixed';

interface EditItem {
  key: string;
  id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_type: DiscountType;
  discount_value: string;
  deleted?: boolean;
}

const DISCOUNT_LABELS: { key: DiscountType; label: string }[] = [
  { key: 'none', label: 'No discount' },
  { key: 'percentage', label: '% off' },
  { key: 'fixed', label: '$ off' },
];

const lineTotal = (i: EditItem) => {
  const gross = num(i.quantity) * num(i.unit_price);
  const d = num(i.discount_value);
  const off = i.discount_type === 'percentage' ? gross * (d / 100) : i.discount_type === 'fixed' ? d : 0;
  return Math.max(0, gross - off);
};

let keySeq = 0;
const newKey = () => `n${++keySeq}`;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export default function EditEstimateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [number, setNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<EditItem[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const est: any = toSnake(await apiRequest(`/estimates/${id}`));
      if (est.status !== 'draft') throw new Error('Only draft estimates can be edited. Create a new estimate instead.');
      setNumber(est.estimate_number || '');
      setClientName(est.client_name || est.intake_form?.contact_name || '');
      setClientPhone(est.client_phone || est.intake_form?.contact_phone || '');
      setIssueDate(est.issue_date || '');
      setExpirationDate(est.expiration_date || '');
      setTaxRate(String(num(est.tax_rate)));
      setDiscount(String(num(est.discount_amount)));
      setNotes(est.notes || '');
      setTerms(est.terms || '');
      const rows: any[] = est.items || est.estimate_items || [];
      setItems(rows.map(i => ({
        key: i.id, id: i.id,
        description: i.description || '',
        quantity: String(num(i.quantity)),
        unit_price: String(num(i.unit_price)),
        discount_type: (i.discount_type || 'none') as DiscountType,
        discount_value: String(num(i.discount_value)),
      })));
      setLoaded(true);
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load estimate'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load once; refocusing must not discard unsaved edits.
  useFocusEffect(useCallback(() => { if (!loaded) load(); }, [load, loaded]));

  const patchItem = (key: string, patch: Partial<EditItem>) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)));
  const removeItem = (key: string) =>
    setItems(prev => prev.flatMap(i => (i.key !== key ? [i] : i.id ? [{ ...i, deleted: true }] : [])));
  const addItem = () =>
    setItems(prev => [...prev, { key: newKey(), description: '', quantity: '1', unit_price: '', discount_type: 'none', discount_value: '0' }]);

  const active = items.filter(i => !i.deleted);
  const subtotal = active.reduce((sum, i) => sum + lineTotal(i), 0);
  const total = subtotal + subtotal * (num(taxRate) / 100) - num(discount);

  const save = async () => {
    if (active.length === 0) { Alert.alert('Validation', 'Keep at least one line item.'); return; }
    if (active.some(i => !i.description.trim())) { Alert.alert('Validation', 'Every line item needs a description.'); return; }
    if (!isDate(issueDate) || !isDate(expirationDate)) { Alert.alert('Validation', 'Please select an issue date and an expiration date.'); return; }
    setSaving(true);
    try {
      const body = (i: EditItem) => ({
        description: i.description.trim(), quantity: num(i.quantity) || 1, unit_price: num(i.unit_price),
        discount_type: i.discount_type, discount_value: i.discount_type === 'none' ? 0 : num(i.discount_value),
      });
      await apiRequest(`/estimates/${id}`, {
        method: 'PUT',
        body: {
          client_name: clientName, client_phone: clientPhone, issue_date: issueDate, expiration_date: expirationDate,
          tax_rate: num(taxRate), discount_amount: num(discount), notes, terms,
        },
      });
      for (const i of items) {
        if (i.id && i.deleted) await apiRequest(`/estimates/items/${i.id}`, { method: 'DELETE' });
        else if (i.id) await apiRequest(`/estimates/items/${i.id}`, { method: 'PUT', body: body(i) });
      }
      const fresh = items.filter(i => !i.id && !i.deleted).map(i => ({ ...body(i), amount: lineTotal(i) }));
      if (fresh.length > 0) await apiRequest(`/estimates/${id}/items`, { method: 'POST', body: fresh });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Stack.Screen options={{ title: 'Edit Estimate' }} /><LoadingState /></>;
  if (error) return <><Stack.Screen options={{ title: 'Edit Estimate' }} /><ErrorState message={error} onRetry={load} /></>;

  return (
    <>
      <Stack.Screen options={{ title: number ? `Edit ${number}` : 'Edit Estimate' }} />
      <ScrollView style={f.container} contentContainerStyle={f.content} keyboardShouldPersistTaps="handled">
        <Section title="Client & dates">
          <View style={styles.stack}>
            <Field label="Client name" value={clientName} onChangeText={setClientName} />
            <Field label="Phone" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
            <DateTimeField label="Issue date" mode="date" value={issueDate} onChange={setIssueDate} required />
            <DateTimeField label="Expiration date" mode="date" value={expirationDate} onChange={setExpirationDate} required />
          </View>
        </Section>

        <Text style={styles.sectionLabel}>Line items</Text>
        {active.map((item, idx) => (
          <View key={item.key} style={styles.lineCard}>
            <View style={styles.lineTop}>
              <Text style={styles.lineNum}>#{idx + 1}</Text>
              <TouchableOpacity onPress={() => removeItem(item.key)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.stack}>
              <Field label="Description" value={item.description} onChangeText={t => patchItem(item.key, { description: t })} />
              <View style={styles.pair}>
                <View style={{ flex: 1 }}>
                  <Field label="Qty" value={item.quantity} onChangeText={t => patchItem(item.key, { quantity: t })} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Unit price" value={item.unit_price} onChangeText={t => patchItem(item.key, { unit_price: t })} keyboardType="decimal-pad" placeholder="0.00" />
                </View>
              </View>
              <View style={styles.chips}>
                {DISCOUNT_LABELS.map(d => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.chip, item.discount_type === d.key && styles.chipActive]}
                    onPress={() => patchItem(item.key, { discount_type: d.key })}
                  >
                    <Text style={[styles.chipText, item.discount_type === d.key && styles.chipTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {item.discount_type !== 'none' && (
                <Field
                  label={item.discount_type === 'percentage' ? 'Discount (%)' : 'Discount ($)'}
                  value={item.discount_value}
                  onChangeText={t => patchItem(item.key, { discount_value: t })}
                  keyboardType="decimal-pad"
                />
              )}
              <Text style={styles.lineAmount}>{fmtMoney(lineTotal(item))}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={addItem}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add line item</Text>
        </TouchableOpacity>

        <Section title="Tax & discount">
          <View style={styles.stack}>
            <Field label="Tax rate (%)" value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" />
            <Field label="Additional discount ($)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
            <Text style={styles.total}>New total: {fmtMoney(total)}</Text>
          </View>
        </Section>

        <Section title="Notes & terms">
          <View style={styles.stack}>
            <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
            <Field label="Terms" value={terms} onChangeText={setTerms} multiline />
          </View>
        </Section>

        <AppButton title="Save Changes" onPress={save} loading={saving} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  pair: { flexDirection: 'row', gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  lineCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineNum: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  lineAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.textWhite },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 16 },
  addBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  total: { fontSize: 18, fontWeight: '800', color: Colors.primary },
});
