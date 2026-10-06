import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { OwnerVenue } from './index';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<OwnerVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable field state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');

  const populateFields = (v: OwnerVenue) => {
    setName(v.name || '');
    setAddress(v.address || '');
    setCity(v.city || '');
    setState(v.state || '');
    setZipCode(v.zip_code || '');
    setPhone(v.phone || '');
    setWebsite(v.website || '');
    setCapacity(v.capacity != null ? String(v.capacity) : '');
    setDescription(v.description || '');
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      // No dedicated GET /owner/venues/:id route exists on the backend —
      // reuse the list endpoint and find the matching venue.
      const data = await apiRequest<{ venues: OwnerVenue[] }>('/owner/venues');
      const found = (data.venues || []).find(v => v.id === id) || null;
      setVenue(found);
      if (found) populateFields(found);
      if (!found) setError('Venue not found');
    } catch (err: any) {
      console.error('Error fetching venue:', err.message);
      setError(err.message || 'Failed to load venue');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (!venue) return;
    if (!name.trim()) {
      Alert.alert('Validation', 'Venue name is required.');
      return;
    }
    setSaving(true);
    try {
      const result = await apiRequest<{ venue: OwnerVenue }>(`/owner/venues/${venue.id}`, {
        method: 'PUT',
        body: {
          name: name.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          capacity: capacity.trim() ? Number(capacity) : undefined,
          description: description.trim() || undefined,
        },
      });
      setVenue(result.venue);
      populateFields(result.venue);
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update venue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!venue) return;
    Alert.alert('Delete Venue', `Delete "${venue.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await apiRequest(`/owner/venues/${venue.id}`, { method: 'DELETE' });
            router.replace('/(tabs)/venues' as any);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete venue');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Venue' }} />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </>
    );
  }

  if (!venue) {
    return (
      <>
        <Stack.Screen options={{ title: 'Venue' }} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error || 'Venue not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: venue.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <TouchableOpacity
              onPress={() => (editing ? setEditing(false) : setEditing(true))}
              style={styles.editToggle}
            >
              <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {(venue.city || venue.state) && !editing && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}</Text>
            </View>
          )}
        </View>

        {editing ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Edit Venue</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={Colors.textMuted} />

              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholderTextColor={Colors.textMuted} />

              <View style={styles.rowFields}>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={styles.rowFieldSmall}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput style={styles.input} value={state} onChangeText={setState} placeholderTextColor={Colors.textMuted} autoCapitalize="characters" maxLength={2} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Zip Code</Text>
              <TextInput style={styles.input} value={zipCode} onChangeText={setZipCode} placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>Website</Text>
              <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="url" />

              <Text style={styles.fieldLabel}>Capacity</Text>
              <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Details</Text>
              <View style={styles.card}>
                <InfoRow icon="location-outline" label="Address" value={[venue.address, venue.city, venue.state, venue.zip_code].filter(Boolean).join(', ') || '—'} />
                <InfoRow icon="people-outline" label="Capacity" value={venue.capacity != null ? `${venue.capacity} guests` : '—'} />
                <InfoRow icon="call-outline" label="Phone" value={venue.phone || '—'} />
                <InfoRow icon="globe-outline" label="Website" value={venue.website || '—'} last />
              </View>
            </View>

            {venue.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <View style={styles.card}>
                  <Text style={styles.descriptionText}>{venue.description}</Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.btnDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? <ActivityIndicator color={Colors.error} size="small" /> : (
                <>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={styles.deleteBtnText}>Delete Venue</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24, gap: 12 },
  errorText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryBtnText: { color: '#FFF', fontWeight: '600' },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, ...Shadow.md, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  venueName: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  editToggle: { padding: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { fontSize: 13, color: Colors.textMuted, flex: 1 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { height: 100, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 2 },
  rowFieldSmall: { flex: 1 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 8,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: { width: 18 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1, maxWidth: '55%', textAlign: 'right' },

  descriptionText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  deleteBtn: {
    backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error,
    borderRadius: Radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginTop: 8,
  },
  deleteBtnText: { color: Colors.error, fontSize: 15, fontWeight: '700' },

  btnDisabled: { opacity: 0.6 },
});
