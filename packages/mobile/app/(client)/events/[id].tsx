import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert, Linking,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { clientApi, ClientAuthError } from '@/lib/clientApi';
import { toList, titleCase, fmtMoney } from '@/components/netFormat';
import { formatDate, formatTimeRange } from '@/components/EvtDate';
import { EVENT_TYPE_LABELS, pick, resolveEventStatus, statusLabel, statusColors } from '@/components/CliShared';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import CliErrorState from '@/components/CliErrorState';

type TeamMember = { id: string; phone: string; name?: string | null; created_at?: string };

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.infoIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ClientEventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;

  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAuth = useCallback((e: unknown) => {
    if (e instanceof ClientAuthError) {
      router.replace('/(auth)/client-login' as never);
      return true;
    }
    return false;
  }, [router]);

  const loadTeam = useCallback(async () => {
    if (!eventId) return;
    setTeamLoading(true);
    try {
      const res = await clientApi(`/events/${encodeURIComponent(eventId)}/team`);
      setMembers(toList<TeamMember>(res));
      setTeamError(null);
    } catch (e: any) {
      if (handleAuth(e)) return;
      setTeamError(e?.message || 'Failed to load team members.');
    } finally {
      setTeamLoading(false);
    }
  }, [eventId, handleAuth]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await clientApi('/events');
      const found = toList(res).find((e: any) => String(e.id) === String(eventId));
      if (!found) {
        setEvent(null);
        setError('This event could not be found. It may have been removed.');
      } else {
        setEvent(found);
        setError(null);
        if (found._type !== 'vendor_booking') loadTeam();
      }
    } catch (e: any) {
      if (handleAuth(e)) return;
      setError(e?.message || 'Failed to load this event.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, handleAuth, loadTeam]);

  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    setActionError(null);
    if (!phone.trim()) { setActionError('A phone number is required.'); return; }
    setAdding(true);
    try {
      await clientApi(`/events/${encodeURIComponent(String(eventId))}/team`, {
        method: 'POST',
        body: { phone: phone.trim(), name: name.trim() || undefined },
      });
      setName('');
      setPhone('');
      await loadTeam();
    } catch (e: any) {
      if (handleAuth(e)) return;
      setActionError(e?.message || 'Failed to add team member.');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = (m: TeamMember) => {
    Alert.alert(
      'Remove team member',
      `Remove ${m.name || m.phone} from the team? They will no longer be able to access this event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionError(null);
            setRemovingId(m.id);
            try {
              await clientApi(`/events/${encodeURIComponent(String(eventId))}/team/${encodeURIComponent(m.id)}`, { method: 'DELETE' });
              setMembers((prev) => prev.filter((x) => x.id !== m.id));
            } catch (e: any) {
              if (handleAuth(e)) return;
              setActionError(e?.message || 'Failed to remove team member.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) return <LoadingState message="Loading event..." />;
  if (error || !event) {
    return <CliErrorState message={error ?? undefined} onRetry={() => { setLoading(true); load(); }} />;
  }

  const status = resolveEventStatus(event);
  const colors = statusColors(status);
  const type = pick<string>(event, 'event_type', 'eventType');
  const date = formatDate(event.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = formatTimeRange(event.start_time ?? event.startTime, event.end_time ?? event.endTime);
  const venue = pick<string>(event, 'venue', 'venue_name');
  const address = pick<string>(event, 'location', 'venue_address');
  const maxGuests = pick<number | string>(event, 'max_guests', 'maxGuests');
  const booking = event.booking;
  const owner = event.owner;
  const ownerName = owner ? [pick(owner, 'first_name', 'firstName'), pick(owner, 'last_name', 'lastName')].filter(Boolean).join(' ') : '';
  const ownerPhone = owner ? pick<string>(owner, 'phone_number', 'phone') : undefined;
  const intakeFormId = pick<string>(event, 'intake_form_id', 'intakeFormId');
  const isVendorBooking = event._type === 'vendor_booking';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={Colors.primary} />}
      >
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.name || 'Event'}</Text>
            <View style={[styles.pill, { backgroundColor: colors.bg }]}>
              <Text style={[styles.pillText, { color: colors.fg }]}>{statusLabel(status)}</Text>
            </View>
          </View>
          {!!type && <Text style={styles.subtitle}>{EVENT_TYPE_LABELS[type] ?? titleCase(type)}</Text>}
          {!!event.description && <Text style={styles.description}>{event.description}</Text>}
          <View style={styles.divider} />
          {!!date && <InfoRow icon="calendar-outline" label="Date" value={date} />}
          {!!time && <InfoRow icon="time-outline" label="Time" value={time} />}
          {!!venue && <InfoRow icon="business-outline" label="Venue" value={venue} />}
          {!!address && <InfoRow icon="location-outline" label="Address" value={address} />}
          {!!maxGuests && <InfoRow icon="people-outline" label="Max guests" value={String(maxGuests)} />}
          {!!event.vendor_name && <InfoRow icon="musical-notes-outline" label="Vendor" value={event.vendor_name} />}
          {!!event.notes && <InfoRow icon="document-text-outline" label="Notes" value={event.notes} />}
        </View>

        {!!booking && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Booking details</Text>
            <InfoRow icon="checkmark-circle-outline" label="Booking status" value={titleCase(booking.status) || '—'} />
            <InfoRow icon="cash-outline" label="Total price" value={fmtMoney(booking.total_amount)} />
            <InfoRow icon="wallet-outline" label="Deposit" value={fmtMoney(booking.deposit_amount)} />
            <InfoRow icon="card-outline" label="Payment status" value={titleCase(booking.payment_status) || '—'} />
            {!!booking.notes && <Text style={styles.quote}>“{booking.notes}”</Text>}
          </View>
        )}

        {!!owner && !!(ownerName || ownerPhone || owner.email) && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Your event organizer</Text>
            {!!ownerName && <Text style={styles.ownerName}>{ownerName}</Text>}
            {!!ownerPhone && (
              <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`tel:${ownerPhone}`)}>
                <Ionicons name="call-outline" size={16} color={Colors.primary} />
                <Text style={styles.link}>{ownerPhone}</Text>
              </TouchableOpacity>
            )}
            {!!owner.email && (
              <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`mailto:${owner.email}`)}>
                <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                <Text style={styles.link}>{owner.email}</Text>
              </TouchableOpacity>
            )}
            <AppButton
              title="Message organizer"
              variant="secondary"
              style={styles.actionBtn}
              onPress={() => router.push('/(client)/messages' as never)}
            />
          </View>
        )}

        {!isVendorBooking && !!intakeFormId && (
          <AppButton
            title="Manage RSVP"
            variant="outline"
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/(client)/rsvp', params: { form: intakeFormId } } as never)}
          />
        )}

        {!isVendorBooking && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Event team</Text>
            <Text style={styles.help}>
              Add people who can help manage this event. They sign in the same way you do, using their own phone number.
            </Text>

            {!!actionError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{actionError}</Text>
              </View>
            )}

            <Text style={styles.label}>Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Maid of Honor"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.label}>Phone number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <AppButton title="Add team member" onPress={addMember} loading={adding} style={styles.actionBtn} />

            <View style={styles.divider} />
            <Text style={styles.sectionSub}>Current team</Text>
            {teamLoading && members.length === 0 ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
            ) : teamError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{teamError}</Text>
                <TouchableOpacity onPress={loadTeam}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
              </View>
            ) : members.length === 0 ? (
              <Text style={styles.empty}>No team members added yet.</Text>
            ) : (
              members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name || 'Unnamed'}</Text>
                    <Text style={styles.memberPhone}>{m.phone}</Text>
                  </View>
                  {removingId === m.id ? (
                    <ActivityIndicator color={Colors.error} />
                  ) : (
                    <TouchableOpacity
                      onPress={() => removeMember(m)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Remove team member"
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: 11, fontWeight: '700' },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  description: { fontSize: 14, color: Colors.textSecondary, marginTop: 10, lineHeight: 20 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  infoIcon: { marginRight: 10, marginTop: 2 },
  infoLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '600' },
  infoValue: { fontSize: 15, color: Colors.textPrimary, marginTop: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  sectionSub: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  quote: { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, marginTop: 6 },
  ownerName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  link: { fontSize: 14, color: Colors.primary },
  actionBtn: { marginTop: 10 },
  help: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  errorBox: {
    backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 10, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.errorText },
  retry: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  empty: { fontSize: 13, color: Colors.textMuted, paddingVertical: 8 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  memberName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  memberPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
});
