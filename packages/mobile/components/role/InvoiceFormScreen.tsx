import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  /** e.g. '/vendor-invoices', '/artist-invoices', '/promoter-invoices' */
  apiBase: string;
  /** e.g. '/(tabs)/vendor-invoices' */
  routeBase: string;
}

export default function InvoiceFormScreen({ apiBase, routeBase }: Props) {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: uid(), description: '', quantity: '1', unit_price: '' },
  ]);
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState('8.5');
  const [discountAmount, setDiscountAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due within 30 days.');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  const addLineItem = () => setLineItems(prev => [...prev, { id: uid(), description: '', quantity: '1', unit_price: '' }]);
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(l => l.id !== id));
  const updateLine = (id: string, field: keyof Omit<LineItem, 'id'>, val: string) =>
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));

  const subtotal = lineItems.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const discount = parseFloat(discountAmount) || 0;
  const taxAmount = includeTax ? (subtotal - discount) * (parseFloat(taxRate) || 0) / 100 : 0;
  const total = subtotal - discount + taxAmount;

  const handleCreate = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      Alert.alert('Validation', 'Client name and email are required.');
      return;
    }
    const validItems = lineItems.filter(l => l.description.trim() && parseFloat(l.unit_price) > 0);
    if (validItems.length === 0) {
      Alert.alert('Validation', 'Add at least one line item with a description and price.');
      return;
    }
    setSaving(true);
    try {
      const invoice = await apiRequest<{ id: string }>(apiBase, {
        method: 'POST',
        body: {
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          client_phone: clientPhone.trim() || undefined,
          issue_date: issueDate,
          due_date: dueDate,
          tax_rate: includeTax ? parseFloat(taxRate) || 0 : 0,
          discount_amount: discount,
          notes: notes.trim() || undefined,
          terms: terms.trim() || undefined,
          items: validItems.map(item => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price) || 0,
          })),
        },
      });
      router.replace(`${routeBase}/${invoice.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Client</Text>
        <View style={[styles.card, { gap: 10 }]}>
          <TextInput style={styles.input} placeholder="Client name" placeholderTextColor={Colors.textMuted} value={clientName} onChangeText={setClientName} />
          <TextInput style={styles.input} placeholder="Client email" placeholderTextColor={Colors.textMuted} value={clientEmail} onChangeText={setClientEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Client phone (optional)" placeholderTextColor={Colors.textMuted} value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={[styles.card, { flexDirection: 'row', gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Issue Date</Text>
            <TextInput style={styles.input} value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Due Date</Text>
            <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.lineItemsHeader}>
          <Text style={styles.sectionLabel}>Line Items</Text>
          <TouchableOpacity onPress={addLineItem} style={styles.addBtn}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {lineItems.map((item, idx) => (
            <View key={item.id} style={[styles.lineItemRow, idx < lineItems.length - 1 && styles.lineBorder]}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Description"
                placeholderTextColor={Colors.textMuted}
                value={item.description}
                onChangeText={v => updateLine(item.id, 'description', v)}
              />
              <TextInput
                style={[styles.input, { width: 50 }]}
                placeholder="Qty"
                placeholderTextColor={Colors.textMuted}
                value={item.quantity}
                onChangeText={v => updateLine(item.id, 'quantity', v)}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { width: 80 }]}
                placeholder="Price"
                placeholderTextColor={Colors.textMuted}
                value={item.unit_price}
                onChangeText={v => updateLine(item.id, 'unit_price', v)}
                keyboardType="decimal-pad"
              />
              {lineItems.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(item.id)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Adjustments</Text>
        <View style={[styles.card, { gap: 10 }]}>
          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>Apply Tax</Text>
            <Switch value={includeTax} onValueChange={setIncludeTax} trackColor={{ true: Colors.primary }} />
          </View>
          {includeTax && (
            <TextInput style={styles.input} placeholder="Tax rate %" placeholderTextColor={Colors.textMuted} value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" />
          )}
          <TextInput style={styles.input} placeholder="Discount amount ($)" placeholderTextColor={Colors.textMuted} value={discountAmount} onChangeText={setDiscountAmount} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes & Terms</Text>
        <View style={[styles.card, { gap: 10 }]}>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Notes (optional)" placeholderTextColor={Colors.textMuted} value={notes} onChangeText={setNotes} multiline />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Terms" placeholderTextColor={Colors.textMuted} value={terms} onChangeText={setTerms} multiline />
        </View>
      </View>

      <View style={styles.totalsCard}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{fmt(subtotal)}</Text></View>
        {discount > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount</Text><Text style={styles.totalValue}>-{fmt(discount)}</Text></View>}
        {includeTax && <View style={styles.totalRow}><Text style={styles.totalLabel}>Tax</Text><Text style={styles.totalValue}>{fmt(taxAmount)}</Text></View>}
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{fmt(total)}</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]} onPress={handleCreate} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Create Invoice</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  input: {
    height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  textArea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  lineItemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  lineItemRow: { flexDirection: 'row', gap: 6, paddingVertical: 10, alignItems: 'center' },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  removeBtn: { padding: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalsCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 20, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  grandTotalRow: { marginTop: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
