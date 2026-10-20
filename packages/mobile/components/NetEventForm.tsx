import { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import NetField from '@/components/NetField';
import DateTimeField from '@/components/DateTimeField';
import NetChips from '@/components/NetChips';

export const EVENT_CATEGORIES = [
  'Music', 'Comedy', 'Sports', 'Arts & Theater', 'Food & Drink',
  'Networking', 'Conference', 'Festival', 'Club Night', 'Other',
];

const AGE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'all_ages', label: 'All ages' },
  { value: '18+', label: '18+' },
  { value: '21+', label: '21+' },
];

export interface EventFormValues {
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  city: string;
  state: string;
  zip_code: string;
  category: string;
  age_restriction: string;
  sales_tax_rate: string;
  image_url: string;
  published: boolean;
}

export interface TierDraft { name: string; price: string; quantity: string; description: string }

export const emptyEventForm: EventFormValues = {
  title: '', description: '', event_date: '', start_time: '', end_time: '',
  venue_name: '', venue_address: '', city: '', state: '', zip_code: '',
  category: '', age_restriction: '', sales_tax_rate: '', image_url: '', published: false,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

type Props = {
  initial?: EventFormValues;
  submitLabel: string;
  saving: boolean;
  withTiers?: boolean;
  paidNeedsPayouts?: boolean;
  onSubmit: (values: EventFormValues, tiers: TierDraft[]) => void;
};

// Shared create/edit form for promoter events (mirrors web promoter/events/new).
export default function NetEventForm({ initial = emptyEventForm, submitLabel, saving, withTiers, paidNeedsPayouts, onSubmit }: Props) {
  const [f, setF] = useState<EventFormValues>(initial);
  const [tiers, setTiers] = useState<TierDraft[]>([]);
  const set = (k: keyof EventFormValues) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.title.trim()) return Alert.alert('Missing info', 'Event title is required.');
    if (!DATE_RE.test(f.event_date.trim())) return Alert.alert('Invalid date', 'Please pick an event date.');
    for (const t of [f.start_time, f.end_time]) {
      if (t.trim() && !TIME_RE.test(t.trim())) return Alert.alert('Invalid time', 'Please pick a valid time.');
    }
    if (f.sales_tax_rate.trim()) {
      const r = Number(f.sales_tax_rate);
      if (!Number.isFinite(r) || r < 0 || r > 20) return Alert.alert('Invalid tax rate', 'Sales tax must be between 0 and 20%.');
    }
    for (const t of tiers) {
      if (!t.name.trim() || !(parseInt(t.quantity, 10) > 0) || !(parseFloat(t.price) >= 0)) {
        return Alert.alert('Ticket tier', 'Each tier needs a name, a price (0 for free) and a quantity.');
      }
    }
    onSubmit(f, tiers);
  };

  const hasPaid = tiers.some((t) => parseFloat(t.price) > 0);

  return (
    <View>
      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.heading}>Event Details</Text>
        <NetField label="Title *" value={f.title} onChangeText={set('title')} placeholder="Summer Night Festival" />
        <NetField label="Description" value={f.description} onChangeText={set('description')} multiline placeholder="Tell people about your event..." />
        <DateTimeField label="Date" mode="date" value={f.event_date} onChange={set('event_date')} required />
        <View style={styles.row}>
          <View style={styles.half}><DateTimeField label="Start" mode="time" value={f.start_time} onChange={set('start_time')} clearable /></View>
          <View style={styles.half}><DateTimeField label="End" mode="time" value={f.end_time} onChange={set('end_time')} clearable /></View>
        </View>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipBleed}>
          <NetChips
            value={f.category}
            onChange={(v) => setF((p) => ({ ...p, category: v === p.category ? '' : v }))}
            options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            activeColor={Colors.purple}
          />
        </View>
        <Text style={styles.label}>Age restriction</Text>
        <View style={styles.chipBleed}>
          <NetChips value={f.age_restriction} onChange={set('age_restriction')} options={AGE_OPTIONS} activeColor={Colors.purple} />
        </View>
        <NetField label="Sales tax rate (%)" value={f.sales_tax_rate} onChangeText={set('sales_tax_rate')} keyboardType="decimal-pad" placeholder="0 – 20" hint="Percent you charge on ticket sales (optional)." />
        <NetField label="Banner image URL" value={f.image_url} onChangeText={set('image_url')} autoCapitalize="none" keyboardType="url" placeholder="https://..." />
      </View>

      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.heading}>Location</Text>
        <NetField label="Venue name" value={f.venue_name} onChangeText={set('venue_name')} />
        <NetField label="Address" value={f.venue_address} onChangeText={set('venue_address')} />
        <View style={styles.row}>
          <View style={{ flex: 2 }}><NetField label="City" value={f.city} onChangeText={set('city')} /></View>
          <View style={{ flex: 1 }}><NetField label="State" value={f.state} onChangeText={set('state')} autoCapitalize="characters" maxLength={2} /></View>
          <View style={{ flex: 1.3 }}><NetField label="ZIP" value={f.zip_code} onChangeText={set('zip_code')} keyboardType="number-pad" /></View>
        </View>
      </View>

      {withTiers && (
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.heading}>Ticket Tiers</Text>
          {tiers.length === 0 && <Text style={styles.muted}>No tiers yet — you can also add them after creating the event.</Text>}
          {tiers.map((t, i) => (
            <View key={i} style={styles.tier}>
              <View style={styles.tierHead}>
                <Text style={styles.tierTitle}>Tier {i + 1}</Text>
                <TouchableOpacity onPress={() => setTiers((p) => p.filter((_, j) => j !== i))} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
              <NetField label="Name" value={t.name} onChangeText={(v) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder="General Admission" />
              <View style={styles.row}>
                <View style={styles.half}><NetField label="Price ($)" value={t.price} onChangeText={(v) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, price: v } : x)))} keyboardType="decimal-pad" placeholder="0 = free" /></View>
                <View style={styles.half}><NetField label="Quantity" value={t.quantity} onChangeText={(v) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, quantity: v } : x)))} keyboardType="number-pad" /></View>
              </View>
              <NetField label="Description" value={t.description} onChangeText={(v) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
            </View>
          ))}
          <AppButton title="+ Add Ticket Tier" variant="secondary" onPress={() => setTiers((p) => [...p, { name: '', price: '', quantity: '', description: '' }])} />
        </View>
      )}

      <View style={[styles.card, Shadow.sm]}>
        <View style={styles.publishRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Publish</Text>
            <Text style={styles.muted}>{f.published ? 'Visible to the public and open for sales.' : 'Saved as a draft — only you can see it.'}</Text>
          </View>
          <Switch
            value={f.published}
            onValueChange={(v) => setF((p) => ({ ...p, published: v }))}
            trackColor={{ true: Colors.purple, false: Colors.border }}
          />
        </View>
        {f.published && hasPaid && paidNeedsPayouts && (
          <Text style={styles.warn}>
            Paid tickets need Stripe payouts connected before buyers can check out. Set it up from your dashboard.
          </Text>
        )}
      </View>

      <AppButton title={submitLabel} onPress={submit} loading={saving} style={styles.submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  heading: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  chipBleed: { marginHorizontal: -16, marginBottom: 6 },
  muted: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  tier: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: 12, marginBottom: 12 },
  tierHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tierTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  publishRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warn: { marginTop: 8, fontSize: 12, color: Colors.warningText, backgroundColor: Colors.warningLight, padding: 10, borderRadius: Radius.md },
  submit: { backgroundColor: Colors.purple },
});
