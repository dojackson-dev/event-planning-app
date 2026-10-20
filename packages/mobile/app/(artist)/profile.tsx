import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import NetField from '@/components/NetField';
import NetChips from '@/components/NetChips';

// Same fields as web artist/dashboard/profile (GET/PUT /artists/me/profile).
const ARTIST_TYPES = [
  { value: 'musician', label: 'Musician / Band' },
  { value: 'dj', label: 'DJ' },
  { value: 'comedian', label: 'Comedian' },
  { value: 'dancer', label: 'Dancer' },
  { value: 'magician', label: 'Magician' },
  { value: 'spoken_word', label: 'Spoken Word' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'other', label: 'Other' },
];

const TRAVEL = [
  { value: '', label: 'Not set' },
  { value: 'Local', label: 'Local' },
  { value: 'Regional', label: 'Regional' },
  { value: 'National', label: 'National' },
  { value: 'International', label: 'International' },
];

interface Form {
  artistName: string;
  stageName: string;
  artistType: string;
  genres: string;
  location: string;
  description: string;
  agentName: string;
  agency: string;
  bookingContactName: string;
  bookingEmail: string;
  bookingPhone: string;
  performanceFeeMin: string;
  performanceFeeMax: string;
  setLengthMinutes: string;
  travelAvailability: string;
  equipmentNeeds: string;
  hospitalityRequirements: string;
  website: string;
  instagram: string;
  youtube: string;
  spotify: string;
  epkUrl: string;
  availableForBooking: boolean;
}

const EMPTY: Form = {
  artistName: '', stageName: '', artistType: 'musician', genres: '', location: '', description: '',
  agentName: '', agency: '', bookingContactName: '', bookingEmail: '', bookingPhone: '',
  performanceFeeMin: '', performanceFeeMax: '', setLengthMinutes: '', travelAvailability: '',
  equipmentNeeds: '', hospitalityRequirements: '', website: '', instagram: '', youtube: '',
  spotify: '', epkUrl: '', availableForBooking: true,
};

const str = (v: unknown) => (v == null ? '' : String(v));
const withScheme = (u: string) => {
  const t = u.trim();
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
};

export default function ArtistProfileScreen() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiRequest<any>('/artists/me/profile');
      if (d) {
        setHasProfile(true);
        setForm({
          artistName: str(d.artist_name), stageName: str(d.stage_name),
          artistType: d.artist_type || 'musician',
          genres: Array.isArray(d.genres) ? d.genres.join(', ') : str(d.genres),
          location: str(d.location), description: str(d.description),
          agentName: str(d.agent_name), agency: str(d.agency),
          bookingContactName: str(d.booking_contact_name),
          bookingEmail: str(d.booking_email), bookingPhone: str(d.booking_phone),
          performanceFeeMin: str(d.performance_fee_min), performanceFeeMax: str(d.performance_fee_max),
          setLengthMinutes: str(d.set_length_minutes), travelAvailability: str(d.travel_availability),
          equipmentNeeds: str(d.equipment_needs), hospitalityRequirements: str(d.hospitality_requirements),
          website: str(d.website), instagram: str(d.instagram), youtube: str(d.youtube),
          spotify: str(d.spotify), epkUrl: str(d.epk_url),
          availableForBooking: d.available_for_booking ?? true,
        });
      } else {
        setHasProfile(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.artistName.trim()) {
      Alert.alert('Missing info', 'Artist name is required.');
      return;
    }
    const num = (s: string) => (s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : undefined);
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest('/artists/me/profile', {
        method: 'PUT',
        body: {
          artistName: form.artistName.trim(),
          stageName: opt(form.stageName),
          agentName: opt(form.agentName),
          bookingContactName: opt(form.bookingContactName),
          bookingEmail: opt(form.bookingEmail),
          bookingPhone: opt(form.bookingPhone),
          agency: opt(form.agency),
          location: opt(form.location),
          artistType: form.artistType,
          genres: form.genres ? form.genres.split(',').map((g) => g.trim()).filter(Boolean) : [],
          description: opt(form.description),
          performanceFeeMin: num(form.performanceFeeMin),
          performanceFeeMax: num(form.performanceFeeMax),
          travelAvailability: opt(form.travelAvailability),
          setLengthMinutes: num(form.setLengthMinutes),
          equipmentNeeds: opt(form.equipmentNeeds),
          hospitalityRequirements: opt(form.hospitalityRequirements),
          website: opt(withScheme(form.website)),
          instagram: opt(form.instagram),
          youtube: opt(form.youtube),
          spotify: opt(form.spotify),
          epkUrl: opt(withScheme(form.epkUrl)),
          availableForBooking: form.availableForBooking,
        },
      });
      setHasProfile(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading your profile..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!hasProfile && (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.warningText} />
          <Text style={styles.noticeText}>
            No artist account found yet. Fill this out and save — your artist account must be set up first for the save to succeed.
          </Text>
        </View>
      )}
      {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      {saved && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.successText} />
          <Text style={styles.successText}>Profile saved</Text>
        </View>
      )}

      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.heading}>Basics</Text>
        <NetField label="Artist Name *" value={form.artistName} onChangeText={set('artistName')} placeholder="Your name or band name" />
        <NetField label="Stage Name" value={form.stageName} onChangeText={set('stageName')} />
        <Text style={styles.label}>Type</Text>
        <View style={styles.chipBleed}>
          <NetChips value={form.artistType} onChange={set('artistType')} options={ARTIST_TYPES} />
        </View>
        <NetField label="Genres" value={form.genres} onChangeText={set('genres')} placeholder="Jazz, Soul, R&B" hint="Comma separated." />
        <NetField label="Location" value={form.location} onChangeText={set('location')} placeholder="City, State" />
        <NetField label="Bio" value={form.description} onChangeText={set('description')} multiline placeholder="Tell promoters about yourself" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Available for booking</Text>
          <Switch value={form.availableForBooking} onValueChange={set('availableForBooking')} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={form.availableForBooking ? Colors.primary : Colors.surface} />
        </View>
      </View>

      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.heading}>Booking Contact</Text>
        <NetField label="Agent Name" value={form.agentName} onChangeText={set('agentName')} />
        <NetField label="Agency" value={form.agency} onChangeText={set('agency')} />
        <NetField label="Contact Name" value={form.bookingContactName} onChangeText={set('bookingContactName')} />
        <NetField label="Booking Email" value={form.bookingEmail} onChangeText={set('bookingEmail')} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
        <NetField label="Booking Phone" value={form.bookingPhone} onChangeText={set('bookingPhone')} keyboardType="phone-pad" placeholder="(555) 555-5555" />
      </View>

      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.heading}>Performance</Text>
        <View style={styles.row}>
          <View style={styles.half}><NetField label="Fee min ($)" value={form.performanceFeeMin} onChangeText={set('performanceFeeMin')} keyboardType="decimal-pad" /></View>
          <View style={styles.half}><NetField label="Fee max ($)" value={form.performanceFeeMax} onChangeText={set('performanceFeeMax')} keyboardType="decimal-pad" /></View>
        </View>
        <NetField label="Set length (minutes)" value={form.setLengthMinutes} onChangeText={set('setLengthMinutes')} keyboardType="number-pad" />
        <Text style={styles.label}>Travel availability</Text>
        <View style={styles.chipBleed}>
          <NetChips value={form.travelAvailability} onChange={set('travelAvailability')} options={TRAVEL} />
        </View>
        <NetField label="Equipment needs" value={form.equipmentNeeds} onChangeText={set('equipmentNeeds')} multiline />
        <NetField label="Hospitality requirements" value={form.hospitalityRequirements} onChangeText={set('hospitalityRequirements')} multiline />
      </View>

      <View style={[styles.card, Shadow.sm]}>
        <Text style={styles.heading}>Links</Text>
        <NetField label="Website" value={form.website} onChangeText={set('website')} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        <NetField label="Instagram" value={form.instagram} onChangeText={set('instagram')} autoCapitalize="none" placeholder="@yourhandle" />
        <NetField label="YouTube" value={form.youtube} onChangeText={set('youtube')} autoCapitalize="none" />
        <NetField label="Spotify" value={form.spotify} onChangeText={set('spotify')} autoCapitalize="none" />
        <NetField label="Press kit (EPK) URL" value={form.epkUrl} onChangeText={set('epkUrl')} autoCapitalize="none" keyboardType="url" />
      </View>

      <AppButton title="Save Profile" onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  noticeBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.warningLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.warningText },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.errorText, fontSize: 13 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, marginBottom: 16,
  },
  successText: { color: Colors.successText, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, marginBottom: 12 },
  heading: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  chipBleed: { marginHorizontal: -16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
});
