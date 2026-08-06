import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

const CATEGORIES = ['concert', 'festival', 'club_night', 'comedy', 'other'];

interface TierInput { id: string; name: string; price: string; quantity: string; }

export default function NewPromoterEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [category, setCategory] = useState('concert');
  const [tiers, setTiers] = useState<TierInput[]>([{ id: '1', name: 'General Admission', price: '', quantity: '' }]);
  const [saving, setSaving] = useState(false);

  const addTier = () => setTiers(prev => [...prev, { id: Date.now().toString(), name: '', price: '', quantity: '' }]);
  const removeTier = (id: string) => setTiers(prev => prev.filter(t => t.id !== id));
  const updateTier = (id: string, field: keyof TierInput, value: string) =>
    setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));

  const handleCreate = async (publish: boolean) => {
    if (!title.trim()) return Alert.alert('Missing info', 'Event title is required.');
    if (!eventDate.trim()) return Alert.alert('Missing info', 'Event date is required (YYYY-MM-DD).');

    const validTiers = tiers.filter(t => t.name.trim() && t.price && t.quantity);

    setSaving(true);
    try {
      const event = await apiRequest<{ id: string }>('/promoter-events', {
        method: 'POST',
        body: {
          title,
          description: description || undefined,
          event_date: eventDate,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          venue_name: venueName || undefined,
          venue_address: venueAddress || undefined,
          city: city || undefined,
          state: state || undefined,
          zip_code: zipCode || undefined,
          category,
          status: publish ? 'published' : 'draft',
          ticket_tiers: validTiers.map(t => ({
            name: t.name,
            price: parseFloat(t.price),
            quantity: parseInt(t.quantity, 10),
          })),
        },
      });
      router.replace(`/(tabs)/promoter-events/${event.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Event Details</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Event title" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Description" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />
        <TextInput style={styles.input} placeholder="Event date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted} value={eventDate} onChangeText={setEventDate} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Start time (HH:MM)" placeholderTextColor={Colors.textMuted} value={startTime} onChangeText={setStartTime} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="End time (HH:MM)" placeholderTextColor={Colors.textMuted} value={endTime} onChangeText={setEndTime} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Venue</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput style={styles.input} placeholder="Venue name" placeholderTextColor={Colors.textMuted} value={venueName} onChangeText={setVenueName} />
        <TextInput style={styles.input} placeholder="Venue address" placeholderTextColor={Colors.textMuted} value={venueAddress} onChangeText={setVenueAddress} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="City" placeholderTextColor={Colors.textMuted} value={city} onChangeText={setCity} />
          <TextInput style={[styles.input, { width: 70 }]} placeholder="State" placeholderTextColor={Colors.textMuted} value={state} onChangeText={setState} autoCapitalize="characters" maxLength={2} />
          <TextInput style={[styles.input, { width: 90 }]} placeholder="Zip" placeholderTextColor={Colors.textMuted} value={zipCode} onChangeText={setZipCode} keyboardType="number-pad" />
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Ticket Tiers</Text>
        <TouchableOpacity onPress={addTier} style={styles.addTierBtn}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addTierText}>Add Tier</Text>
        </TouchableOpacity>
      </View>
      {tiers.map((tier, idx) => (
        <View key={tier.id} style={[styles.card, { gap: 10 }]}>
          <View style={styles.tierHeader}>
            <Text style={styles.tierLabel}>Tier {idx + 1}</Text>
            {tiers.length > 1 && (
              <TouchableOpacity onPress={() => removeTier(tier.id)}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
          <TextInput style={styles.input} placeholder="Tier name (e.g. General Admission)" placeholderTextColor={Colors.textMuted} value={tier.name} onChangeText={v => updateTier(tier.id, 'name', v)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Price ($)" placeholderTextColor={Colors.textMuted} value={tier.price} onChangeText={v => updateTier(tier.id, 'price', v)} keyboardType="decimal-pad" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Quantity" placeholderTextColor={Colors.textMuted} value={tier.quantity} onChangeText={v => updateTier(tier.id, 'quantity', v)} keyboardType="number-pad" />
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={() => handleCreate(true)} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Publish Event</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.draftBtn, saving && styles.saveBtnDisabled]} onPress={() => handleCreate(false)} disabled={saving}>
        <Text style={styles.draftBtnText}>Save as Draft</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addTierText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, marginBottom: 16 },
  input: {
    height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  textArea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: '#FFF' },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  draftBtn: { borderRadius: Radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  draftBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
});
