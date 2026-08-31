import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
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

let idSeq = 1;
const newItem = (): LineItem => ({ id: String(idSeq++), description: '', quantity: '1', unit_price: '0' });

export default function NewVendorInvoiceScreen() {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(in30);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id: string) =>
    setItems(prev => (prev.length > 1 ? prev.filter(it => it.id !== id) : prev));

  const total = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0,
  );

  const handleSubmit = async () => {
    setError('');
    if (!clientName.trim()) { setError('Client name is required'); return; }
    if (!issueDate.trim() || !dueDate.trim()) { setError('Issue date and due date are required'); return; }
    const validItems = items.filter(it => it.description.trim());
    if (validItems.length === 0) { setError('Add at least one line item'); return; }

    setSaving(true);
    try {
      const created = await apiRequest<{ id: string }>('/vendor-invoices', {
        method: 'POST',
        body: {
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || undefined,
          client_phone: clientPhone.trim() || undefined,
          issue_date: issueDate,
          due_date: dueDate,
          notes: notes.trim() || undefined,
          terms: terms.trim() || undefined,
          items: validItems.map(it => ({
            description: it.description.trim(),
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
          })),
        },
      });
      router.replace(`/(vendor)/invoices/${created.id}` as any);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="client@email.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>Phone</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Issue Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={issueDate}
            onChangeText={setIssueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Line Items</Text>
          <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        {items.map((it, idx) => (
          <View key={it.id} style={styles.card}>
            <View style={styles.itemHeaderRow}>
              <Text style={styles.fieldLabel}>Item {idx + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(it.id)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={it.description}
              onChangeText={v => updateItem(it.id, 'description', v)}
              placeholder="Description"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Qty</Text>
                <TextInput
                  style={styles.input}
                  value={it.quantity}
                  onChangeText={v => updateItem(it.id, 'quantity', v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unit Price</Text>
                <TextInput
                  style={styles.input}
                  value={it.unit_price}
                  onChangeText={v => updateItem(it.id, 'unit_price', v)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes & Terms</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes for the client"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <Text style={styles.fieldLabel}>Terms</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={terms}
            onChangeText={setTerms}
            placeholder="Payment terms"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Create Invoice</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.errorText, fontSize: 13 },
  section: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 12, ...Shadow.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row', gap: 12, marginTop: 4 },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 16 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  totalValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
