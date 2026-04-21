import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

interface EventOption {
  id: string;
  name: string;
  date: string;
  intake_form_id?: string;
  intake_form?: { contact_name?: string; contact_phone?: string; event_name?: string } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const uid = () => Math.random().toString(36).slice(2);

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: uid(), description: '', quantity: '1', unit_price: '' },
  ]);
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState('8.5');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment due within 30 days.');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  // Auto-select event if navigated from event detail page
  useEffect(() => {
    if (eventId && events.length > 0) {
      const ev = events.find(e => e.id === eventId);
      if (ev && !selectedEventId) selectEvent(ev);
    }
  }, [eventId, events]);

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('event')
      .select('id, name, date, intake_form_id, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, event_name)')
      .eq('owner_id', user.id)
      .order('date', { ascending: false });
    setEvents((data as unknown as EventOption[]) || []);
  };

  const selectEvent = (ev: EventOption) => {
    setSelectedEventId(ev.id);
    setEventLabel(`${ev.intake_form?.event_name || ev.name} — ${new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
    setClientName(ev.intake_form?.contact_name || '');
    setClientPhone(ev.intake_form?.contact_phone || '');
    setShowEventPicker(false);
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: uid(), description: '', quantity: '1', unit_price: '' }]);
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(l => l.id !== id));
  const updateLine = (id: string, field: keyof Omit<LineItem, 'id'>, val: string) =>
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));

  const subtotal = lineItems.reduce((sum, l) => {
    return sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  }, 0);
  const discount = parseFloat(globalDiscount) || 0;
  const taxAmount = includeTax ? (subtotal - discount) * (parseFloat(taxRate) || 0) / 100 : 0;
  const total = subtotal - discount + taxAmount;

  const handleCreate = async () => {
    const validItems = lineItems.filter(l => l.description.trim() && parseFloat(l.unit_price) > 0);
    if (validItems.length === 0) {
      Alert.alert('Validation', 'Add at least one line item with a description and price.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selectedEvent = events.find(e => e.id === selectedEventId);

      const items = validItems.map((item, idx) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        subtotal: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
        amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
        discount_type: 'none' as const,
        discount_value: 0,
        discount_amount: 0,
        sort_order: idx,
        item_type: 'revenue' as const,
      }));

      const invoice = await apiRequest('/invoices', {
        method: 'POST',
        body: {
          invoice: {
            owner_id: user.id,
            created_by: user.id,
            intake_form_id: selectedEvent?.intake_form_id || null,
            client_name: clientName || null,
            client_phone: clientPhone || null,
            subtotal,
            tax_rate: includeTax ? parseFloat(taxRate) : 0,
            tax_amount: taxAmount,
            discount_amount: discount,
            total_amount: total,
            amount_paid: 0,
            amount_due: total,
            status: 'draft',
            issue_date: issueDate,
            due_date: dueDate,
            notes: notes || null,
            terms: terms || null,
          },
          items,
        },
      });

      Alert.alert('Invoice Created', 'Invoice saved as draft.', [
        { text: 'View Invoice', onPress: () => router.replace(`/(tabs)/invoices/${invoice.id}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Event selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Event</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setShowEventPicker(v => !v)}>
          <Text style={[styles.selectText, !selectedEventId && styles.placeholder]}>
            {selectedEventId ? eventLabel : 'Select event (optional)'}
          </Text>
          <Ionicons name={showEventPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {showEventPicker && (
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSelectedEventId(''); setClientName(''); setClientPhone(''); setEventLabel(''); setShowEventPicker(false); }}>
              <Text style={styles.dropdownText}>— None —</Text>
            </TouchableOpacity>
            {events.map(ev => (
              <TouchableOpacity key={ev.id} style={styles.dropdownItem} onPress={() => selectEvent(ev)}>
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {ev.intake_form?.event_name || ev.name} — {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                {ev.intake_form?.contact_name && (
                  <Text style={styles.dropdownSub}>{ev.intake_form.contact_name}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Client info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Client</Text>
        <TextInput
          style={styles.input}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Client name"
          placeholderTextColor={Colors.textMuted}
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={clientPhone}
          onChangeText={setClientPhone}
          placeholder="Phone number (for SMS)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
        />
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
              value={globalDiscount}
              onChangeText={setGlobalDiscount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.totalRow}>
            <View style={styles.taxRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Switch
                value={includeTax}
                onValueChange={setIncludeTax}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#FFF"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            {includeTax && (
              <View style={styles.taxInputRow}>
                <TextInput
                  style={[styles.inlineInput, { width: 60 }]}
                  value={taxRate}
                  onChangeText={setTaxRate}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.totalLabel}>%  →  {fmt(taxAmount)}</Text>
              </View>
            )}
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{fmt(total)}</Text>
          </View>
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

      {/* Notes & Terms */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional notes..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Terms</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={terms}
          onChangeText={setTerms}
          placeholder="Payment terms..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.createBtn, saving && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
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
  selectBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.border, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  selectText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textMuted },
  dropdown: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, marginTop: 4,
    borderWidth: 1, borderColor: Colors.border, maxHeight: 220, overflow: 'scroll',
    ...Shadow.md,
  },
  dropdownItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  dropdownText: { fontSize: 14, color: Colors.textPrimary },
  dropdownSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12,
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
  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
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
  taxInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
