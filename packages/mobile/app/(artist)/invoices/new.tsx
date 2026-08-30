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

const today = new Date().toISOString().split('T')[0];
const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const uid = () => Math.random().toString(36).slice(2);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

export default function NewArtistInvoiceScreen() {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(in30);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: uid(), description: '', quantity: '1', unit_price: '' },
  ]);
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due within 30 days.');
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
    if (!clientName.trim()) {
      Alert.alert('Validation', 'Client name is required.');
      return;
    }
    if (!clientEmail.trim()) {
      Alert.alert('Validation', 'Client email is required.');
      return;
    }
    const validItems = lineItems.filter(l => l.description.trim() && parseFloat(l.unit_price) > 0);
    if (validItems.length === 0) {
      Alert.alert('Validation', 'Add at least one line item with a description and price.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: includeTax ? (parseFloat(taxRate) || 0) : 0,
        discount_amount: discount,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        items: validItems.map(item => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        })),
      };
      const invoice = await apiRequest<{ id: string }>('/artist-invoices', { method: 'POST', body });
      router.replace(`/(artist)/invoices/${invoice.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Client */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Client</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Client name"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Email *</Text>
          <TextInput
            style={styles.input}
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="client@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Phone</Text>
          <TextInput
            style={styles.input}
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="(555) 555-5555"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Dates */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Issue Date</Text>
            <TextInput
              style={styles.inlineInput}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Due Date</Text>
            <TextInput
              style={styles.inlineInput}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      </View>

      {/* Line items */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Line Items</Text>
        {lineItems.map((item, idx) => (
          <View key={item.id} style={styles.lineItem}>
            <View style={styles.lineTop}>
              <Text style={styles.lineNum}>#{idx + 1}</Text>
              {lineItems.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={item.description}
              onChangeText={v => updateLine(item.id, 'description', v)}
              placeholder="Description"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.lineRow}>
              <View style={styles.lineField}>
                <Text style={styles.fieldLabel}>Qty</Text>
                <TextInput
                  style={styles.smallInput}
                  value={item.quantity}
                  onChangeText={v => updateLine(item.id, 'quantity', v)}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={[styles.lineField, { flex: 2 }]}>
                <Text style={styles.fieldLabel}>Unit Price ($)</Text>
                <TextInput
                  style={styles.smallInput}
                  value={item.unit_price}
                  onChangeText={v => updateLine(item.id, 'unit_price', v)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={[styles.lineField, { flex: 2, alignItems: 'flex-end' }]}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <Text style={styles.lineAmount}>
                  {fmt((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                </Text>
              </View>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={addLineItem}>
          <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add Line Item</Text>
        </TouchableOpacity>
      </View>

      {/* Totals */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Totals</Text>
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount ($)</Text>
            <TextInput
              style={styles.inlineInput}
              value={discountAmount}
              onChangeText={setDiscountAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.totalRow}>
            <View style={styles.taxRow}>
              <Switch value={includeTax} onValueChange={setIncludeTax} trackColor={{ true: Colors.primary }} />
              <Text style={styles.totalLabel}>Tax (%)</Text>
            </View>
            {includeTax && (
              <TextInput
                style={styles.inlineInput}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            )}
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{fmt(total)}</Text>
          </View>
        </View>
      </View>

      {/* Notes & Terms */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes &amp; Terms</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes for the client"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Terms</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={terms}
            onChangeText={setTerms}
            placeholder="Payment terms"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createBtn, saving && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name="receipt-outline" size={18} color="#FFF" />
            <Text style={styles.createBtnText}>Create Invoice</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { height: 80, textAlignVertical: 'top' },

  lineItem: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lineNum: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  lineRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-end' },
  lineField: { flex: 1 },
  smallInput: {
    backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 8,
    borderWidth: 1, borderColor: Colors.border, fontSize: 14, color: Colors.textPrimary,
  },
  lineAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingVertical: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  taxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: {
    backgroundColor: Colors.background, borderRadius: Radius.sm, paddingHorizontal: 10,
    paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, fontSize: 14,
    color: Colors.textPrimary, minWidth: 80, textAlign: 'right',
  },
  totalFinal: { borderBottomWidth: 0, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  createBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
