import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Alert, Modal, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import NetChips from '@/components/NetChips';
import NetField from '@/components/NetField';
import { fmtMoney, toList } from '@/components/netFormat';

interface Attendee {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  amount_paid: number;
  status: string;
  scanned_at?: string | null;
  ticket_tiers: { name: string } | null;
}

interface Tier { id: string; name: string }

const isCheckedIn = (s: string) => s === 'used' || s === 'checked_in';

// Door check-in: scan QR codes with the camera, tap "Check In" on a guest, or type a ticket / VIP code.
export default function PromoterAttendeesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [comp, setComp] = useState<{ tier_id: string; recipient_email: string; recipient_name: string; recipient_phone: string } | null>(null);
  const [sendingComp, setSendingComp] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [a, e] = await Promise.all([
        apiRequest<any>(`/promoter-events/${id}/attendees`),
        apiRequest<any>(`/promoter-events/${id}`),
      ]);
      setAttendees(toList<Attendee>(a, 'attendees'));
      setTiers(toList<Tier>(e?.ticket_tiers));
    } catch (err: any) {
      setError(err?.message || 'Failed to load attendees.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => {
    const checked = attendees.filter((a) => isCheckedIn(a.status)).length;
    return { total: attendees.length, checked };
  }, [attendees]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendees.filter((a) => {
      if (filter === 'in' && !isCheckedIn(a.status)) return false;
      if (filter === 'out' && isCheckedIn(a.status)) return false;
      if (!q) return true;
      return [a.buyer_name, a.buyer_email, a.buyer_phone, a.id].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [attendees, search, filter]);

  const checkIn = async (ticketId: string) => {
    setBusyId(ticketId);
    try {
      const res = await apiRequest<{ reason?: string }>(`/promoter-events/${id}/scan-ticket`, {
        method: 'POST',
        body: { ticket_id: ticketId },
      });
      Alert.alert('Checked in', res?.reason || 'Ticket scanned successfully');
      await load();
    } catch (err: any) {
      Alert.alert('Check-in failed', err?.message || 'Could not check in this ticket.');
    } finally {
      setBusyId(null);
    }
  };

  // Typed code: regular ticket first, then fall back to a VIP QR code (same order as the web scanner).
  const submitCode = async () => {
    const value = code.trim();
    if (!value) return;
    setScanning(true);
    try {
      try {
        const res = await apiRequest<{ valid?: boolean; reason?: string }>(`/promoter-events/${id}/scan-ticket`, {
          method: 'POST',
          body: { ticket_id: value },
        });
        Alert.alert(res?.valid === false ? 'Denied' : 'Valid', res?.reason || 'Ticket scanned successfully');
      } catch (ticketErr: any) {
        const msg = String(ticketErr?.message || '');
        if (!/not found/i.test(msg)) throw ticketErr;
        const vip = await apiRequest<{ message?: string }>(`/vip/events/${id}/scan`, {
          method: 'POST',
          body: { qr_code: value, check_in_mode: 'full' },
        });
        Alert.alert('Valid', vip?.message || 'VIP guest checked in');
      }
      setCode('');
      await load();
    } catch (err: any) {
      Alert.alert('Denied', err?.message || 'Code not recognized');
    } finally {
      setScanning(false);
    }
  };

  const resend = async (ticketId: string) => {
    setBusyId(ticketId);
    try {
      await apiRequest(`/promoter-events/${id}/attendees/${ticketId}/resend-confirmation`, { method: 'POST' });
      Alert.alert('Sent', 'Ticket confirmation was resent.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not resend confirmation.');
    } finally {
      setBusyId(null);
    }
  };

  const sendComp = async () => {
    if (!comp) return;
    if (!comp.tier_id) return Alert.alert('Comp ticket', 'Select a ticket tier.');
    if (!comp.recipient_email.trim()) return Alert.alert('Comp ticket', 'Recipient email is required.');
    setSendingComp(true);
    try {
      await apiRequest(`/promoter-events/${id}/comp-ticket`, {
        method: 'POST',
        body: {
          tier_id: comp.tier_id,
          recipient_email: comp.recipient_email.trim(),
          recipient_name: comp.recipient_name.trim() || undefined,
          recipient_phone: comp.recipient_phone.trim() || undefined,
        },
      });
      setComp(null);
      Alert.alert('Sent', 'Comp ticket sent.');
      await load();
    } catch (err: any) {
      Alert.alert('Could not send comp ticket', err?.message || 'Please try again.');
    } finally {
      setSendingComp(false);
    }
  };

  if (loading) return <LoadingState message="Loading attendees..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load attendees" message={error} />
        <View style={styles.retry}><AppButton title="Try Again" variant="outline" onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push({ pathname: '/(promoter)/events/scan', params: { id } } as any)}
          accessibilityRole="button"
        >
          <Ionicons name="scan-outline" size={20} color={Colors.textWhite} />
          <Text style={styles.scanBtnText}>Scan with camera</Text>
        </TouchableOpacity>
        <View style={styles.codeRow}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="Enter ticket / VIP code to check in"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submitCode}
            returnKeyType="go"
          />
          <TouchableOpacity style={[styles.goBtn, (!code.trim() || scanning) && { opacity: 0.5 }]} onPress={submitCode} disabled={!code.trim() || scanning}>
            <Ionicons name="checkmark" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, email or phone"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.summary}>{counts.checked} of {counts.total} checked in</Text>
      </View>

      <NetChips
        value={filter}
        onChange={setFilter}
        activeColor={Colors.purple}
        options={[
          { value: '', label: 'All' },
          { value: 'out', label: 'Not checked in' },
          { value: 'in', label: 'Checked in' },
        ]}
      />

      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.purple} />}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title={attendees.length ? 'No matches' : 'No attendees yet'} message={attendees.length ? 'Try a different search or filter.' : 'Ticket buyers will appear here.'} />
        }
        renderItem={({ item }) => {
          const done = isCheckedIn(item.status);
          return (
            <View style={[styles.card, Shadow.sm]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.buyer_name || item.buyer_email || 'Guest'}</Text>
                  <Text style={styles.sub}>{item.ticket_tiers?.name || 'Ticket'} · {fmtMoney(item.amount_paid)}</Text>
                  {!!item.buyer_email && !!item.buyer_name && <Text style={styles.sub} numberOfLines={1}>{item.buyer_email}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: done ? Colors.successLight : item.status === 'valid' ? Colors.infoLight : Colors.borderLight }]}>
                  <Text style={[styles.badgeText, { color: done ? Colors.successText : item.status === 'valid' ? Colors.infoText : Colors.textSecondary }]}>
                    {done ? 'Checked in' : item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                {!done && item.status === 'valid' && (
                  <TouchableOpacity style={styles.primaryAction} onPress={() => checkIn(item.id)} disabled={busyId === item.id}>
                    <Text style={styles.primaryActionText}>{busyId === item.id ? '...' : 'Check In'}</Text>
                  </TouchableOpacity>
                )}
                {!!item.buyer_phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.buyer_phone}`)} hitSlop={8}>
                    <Ionicons name="call-outline" size={20} color={Colors.purple} />
                  </TouchableOpacity>
                )}
                {!!item.buyer_email && (
                  <TouchableOpacity onPress={() => resend(item.id)} disabled={busyId === item.id} hitSlop={8}>
                    <Text style={styles.link}>Resend</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <AppButton title="Send Comp Ticket" variant="secondary" style={styles.compBtn} onPress={() => setComp({ tier_id: tiers[0]?.id || '', recipient_email: '', recipient_name: '', recipient_phone: '' })} />
        }
      />

      <Modal visible={!!comp} animationType="slide" transparent onRequestClose={() => setComp(null)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Comp Ticket</Text>
            <Text style={styles.label}>Ticket tier</Text>
            <NetChips
              value={comp?.tier_id || ''}
              onChange={(v) => setComp((p) => p && { ...p, tier_id: v })}
              activeColor={Colors.purple}
              options={tiers.map((t) => ({ value: t.id, label: t.name }))}
            />
            <NetField label="Recipient email *" value={comp?.recipient_email || ''} onChangeText={(v) => setComp((p) => p && { ...p, recipient_email: v })} keyboardType="email-address" autoCapitalize="none" />
            <NetField label="Recipient name" value={comp?.recipient_name || ''} onChangeText={(v) => setComp((p) => p && { ...p, recipient_name: v })} />
            <NetField label="Recipient phone" value={comp?.recipient_phone || ''} onChangeText={(v) => setComp((p) => p && { ...p, recipient_phone: v })} keyboardType="phone-pad" />
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}><AppButton title="Cancel" variant="outline" onPress={() => setComp(null)} /></View>
              <View style={{ flex: 1 }}><AppButton title="Send" onPress={sendComp} loading={sendingComp} style={{ backgroundColor: Colors.purple }} /></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  retry: { paddingHorizontal: 32, marginTop: -20 },
  header: { padding: 16, paddingBottom: 0, gap: 10 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.purple, borderRadius: Radius.md, paddingVertical: 12, marginBottom: 10,
  },
  scanBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 15 },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.purple,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: Colors.textPrimary,
  },
  goBtn: { width: 46, borderRadius: Radius.md, backgroundColor: Colors.purple, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  summary: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  list: { padding: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, gap: 10 },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  primaryAction: { backgroundColor: Colors.purple, paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.md },
  primaryActionText: { color: Colors.textWhite, fontWeight: '700', fontSize: 13 },
  link: { fontSize: 13, fontWeight: '600', color: Colors.purple },
  compBtn: { marginTop: 8 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
