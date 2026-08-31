import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface VenueResponse {
  venue: {
    id: string;
    name: string;
  };
}

export default function NewVenueScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Venue name is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const result = await apiRequest<VenueResponse>('/owner/venues', {
        method: 'POST',
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

      Alert.alert('Venue Created', `"${result.venue.name}" was added.`, [
        { text: 'View Venue', onPress: () => router.replace(`/(tabs)/venues/${result.venue.id}` as any) },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to create venue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Venue Details</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. The Grand Hall"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.rowFieldSmall}>
              <Text style={styles.fieldLabel}>State</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="ST"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Zip Code</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="Zip code"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contact & Capacity</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Website</Text>
          <TextInput
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.fieldLabel}>Capacity</Text>
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="Guest capacity"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell clients about this venue..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.createBtn, saving && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
          <>
            <Ionicons name="business-outline" size={18} color="#FFF" />
            <Text style={styles.createBtnText}>Create Venue</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.errorText },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm, gap: 4 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { height: 100, textAlignVertical: 'top' },

  rowFields: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 2 },
  rowFieldSmall: { flex: 1 },

  createBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
