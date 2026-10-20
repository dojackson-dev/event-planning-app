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
  orig?: { description: string; quantity: number; unit_price: number; discount_type: DiscountType; discount_value: number };
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

export default function EditInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<EditItem[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const inv: any = toSnake(await apiRequest(`/invoices/${id}`));
      const form = inv.intake_form;
      const booking = inv.booking;
      setInvoiceNumber(inv.invoice_number || '');
      setAmountPaid(num(inv.amount_paid));
      setClientName(inv.client_name || booking?.contact_name || form?.contact_name || '');
      setClientEmail(inv.client_email || booking?.contact_email || form?.contact_email || '');
      setClientPhone(inv.client_phone || booking?.contact_phone || form?.contact_phone || '');
      setDueDate(inv.due_date || '');
      setTaxRate(String(num(inv.tax_rate)));
      setDiscount(String(num(inv.discount_amount)));
      setNotes(inv.notes || '');
      setTerms(inv.terms || '');
      setItems(
        (inv.items || [])
          .filter((i: any) => !i.item_type || i.item_type === 'revenue')
          .map((i: any) => {
            const dt: DiscountType = (i.discount_type || 'none') as DiscountType;
            return {
              key: i.id,
              id: i.id,
              description: i.description || '',
              quantity: String(num(i.quantity)),
              unit_price: String(num(i.unit_price)),
              discount_type: dt,
              discount_value: String(num(i.discount_value)),
              orig: {
                description: i.description || '', quantity: num(i.quantity), unit_price: num(i.unit_price),
                discount_type: dt, discount_value: num(i.discount_value),
              },
            } as EditItem;
          }),
      );
      setLoaded(true);
    } catch (err: any) {
      setError(errMsg(err, 'Failed to load invoice'));
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
  const newTotal = subtotal + subtotal * (num(taxRate) / 100) - num(discount);

  const save = async () => {
    if (active.length === 0) { Alert.alert('Validation', 'Keep at least one line item.'); return; }
    if (active.some(i => !i.description.trim())) { Alert.alert('Validation', 'Every line item needs a description.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) { Alert.alert('Validation', 'Please select a valid due date.'); return; }
    if (amountPaid > 0 && newTotal < amountPaid) {
      Alert.alert('Total too low', `The new total (${fmtMoney(newTotal)}) is less than the ${fmtMoney(amountPaid)} already paid.`);
      return;
    }
    setSaving(true);
    try {
      const fresh: any[] = [];
      for (const i of items) {
        const dv = i.discount_type === 'none' ? 0 : num(i.discount_value);
        if (!i.id) {
          if (!i.deleted) {
            fresh.push({
              description: i.description.trim(), quantity: num(i.quantity) || 1, unit_price: num(i.unit_price),
              item_type: 'revenue', discount_type: i.discount_type, discount_value: dv,
            });
          }
        } else if (i.deleted) {
          await apiRequest(`/invoices/items/${i.id}`, { method: 'DELETE' });
        } else {
          const o = i.orig!;
          const changed =
            i.description !== o.description || num(i.quantity) !== o.quantity || num(i.unit_price) !== o.unit_price ||
            i.discount_type !== o.discount_type || num(i.discount_value) !== o.discount_value;
          if (changed) {
            await apiRequest(`/invoices/items/${i.id}`, {
              method: 'PUT',
              body: {
                description: i.description.trim(), quantity: num(i.quantity) || 1, unit_price: num(i.unit_price),
                discount_type: i.discount_type, discount_value: dv,
              },
            });
          }
        }
      }
      if (fresh.length > 0) await apiRequest(`/invoices/${id}/items`, { method: 'POST', body: fresh });
      await apiRequest(`/invoices/${id}`, {
        method: 'PUT',
        body: {
          client_name: clientName || null,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          due_date: dueDate,
          tax_rate: num(taxRate),
          discount_amount: num(discount),
          notes: notes || null,
          terms: terms || null,
        },
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', errMsg(err, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Stack.Screen options={{ title: 'Edit Invoice' }} /><LoadingState /></>;
  if (error) return <><Stack.Screen options={{ title: 'Edit Invoice' }} /><ErrorState message={error} onRetry={load} /></>;

  return (
    <>
      <Stack.Screen options={{ title: invoiceNumber ? `Edit ${invoiceNumber}` : 'Edit Invoice' }} />
      <ScrollView style={f.container} contentContainerStyle={f.content} keyboardShouldPersistTaps="handled">
        <Section title="Client">
          <View style={styles.stack}>
            <Field label="Name" value={clientName} onChangeText={setClientName} placeholder="Client name" />
            <Field label="Email" value={clientEmail} onChangeText={setClientEmail} keyboardType="email-address" autoCapitalize="none" placeholder="client@email.com" />
            <Field label="Phone" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" placeholder="(555) 555-5555" />
            <DateTimeField label="Due date" mode="date" value={dueDate} onChange={setDueDate} required />
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
            <Text style={styles.total}>New total: {fmtMoney(newTotal)}</Text>
            {amountPaid > 0 && <Text style={f.lineMeta}>Already paid: {fmtMoney(amountPaid)}</Text>}
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
