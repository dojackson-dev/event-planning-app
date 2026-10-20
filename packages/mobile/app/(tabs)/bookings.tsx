import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput,
  Alert, Linking, Modal, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import {
  CrmBooking, CrmInvoice, CLIENT_STATUS_LABELS, CLIENT_STATUS_TONES, bookingClientStatus,
  bookingClientName, bookingEventName, bookingDate, bookingMoney, formatDate, formatTime,
  money, titleCase, errorMessage,
} from '@/components/CrmShared';

type Filter = 'all' | 'deposit_paid' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All Bookings' },
  { key: 'deposit_paid', label: 'Deposit Paid' },
  { key: 'completed', label: 'Balance Paid' },
];

const confirmationColor = (s: string) =>
  s === 'confirmed' ? Colors.success : s === 'rejected' || s === 'cancelled' ? Colors.error : Colors.warning;

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<CrmBooking[]>([]);
  const [invoices, setInvoices] = useState<CrmInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<CrmBooking | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, invoicesRes] = await Promise.allSettled([
        apiRequest<CrmBooking[]>('/bookings'),
        apiRequest<CrmInvoice[]>('/invoices'),
      ]);
      if (bookingsRes.status === 'rejected') throw bookingsRes.reason;
      setBookings(Array.isArray(bookingsRes.value) ? bookingsRes.value : []);
      // Invoices only enrich paid/due amounts; the list still works without them.
      setInvoices(invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value) ? invoicesRes.value : []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load bookings.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => filter === 'all' || bookingClientStatus(b) === filter)
      .filter((b) => {
        if (!q) return true;
        return (
          bookingClientName(b).toLowerCase().includes(q) ||
          bookingEventName(b).toLowerCase().includes(q) ||
          (b.contact_email ?? b.intake_form?.contact_email ?? '').toLowerCase().includes(q)
        );
      });
  }, [bookings, filter, search]);

  const cancelBooking = (b: CrmBooking) => {
    Alert.alert('Cancel booking', 'Cancel this booking? The client will be notified.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          setBusyId(b.id);
          try {
            await apiRequest(`/bookings/${b.id}/cancel`, { method: 'PATCH' });
            await fetchData();
          } catch (err) {
            Alert.alert('Error', errorMessage(err, 'Failed to cancel booking.'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const resendConfirmation = async (b: CrmBooking) => {
    setBusyId(b.id);
    try {
      await apiRequest(`/bookings/${b.id}/resend-confirmation`, { method: 'PATCH' });
      Alert.alert('Sent', 'Event notification resent to client.');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Failed to resend notification.'));
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (b: CrmBooking, status: string) => {
    setStatusTarget(null);
    setBusyId(b.id);
    try {
      await apiRequest(`/bookings/${b.id}`, { method: 'PATCH', body: { client_status: status } });
      await fetchData();
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Failed to update client status.'));
    } finally {
      setBusyId(null);
    }
  };

  const renderBooking = ({ item }: { item: CrmBooking }) => {
    const status = bookingClientStatus(item);
    const tone = CLIENT_STATUS_TONES[status] ?? CLIENT_STATUS_TONES.contacted_by_phone;
    const cancelled = status === 'cancelled';
    const { total, paid, due } = bookingMoney(item, invoices);
    const phone = item.contact_phone ?? item.intake_form?.contact_phone;
    const email = item.contact_email ?? item.intake_form?.contact_email;
    const confirmation = item.client_confirmation_status;
    const date = bookingDate(item);
    const time = item.start_time ? ` · ${formatTime(item.start_time)}` : '';
    const busy = busyId === item.id;

    return (
      <View style={[styles.card, Shadow.sm, cancelled && styles.cancelledCard]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push(`/(tabs)/events/${item.id}` as any)}
        >
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName} numberOfLines={1}>{bookingClientName(item)}</Text>
              <Text style={styles.eventName} numberOfLines={1}>{bookingEventName(item)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.badgeText, { color: tone.text }]}>
                {CLIENT_STATUS_LABELS[status] ?? titleCase(status)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.meta}>{formatDate(date)}{time}</Text>
            {!!item.venue && <Text style={styles.meta} numberOfLines={1}>· {item.venue}</Text>}
          </View>

          <View style={styles.moneyRow}>
            <MoneyCell label="Total" value={money(total)} />
            <MoneyCell label="Paid" value={money(paid)} color={Colors.success} />
            <MoneyCell label="Due" value={money(due)} color={due > 0 ? Colors.warning : Colors.textSecondary} />
          </View>

          {!!confirmation && (
            <Text style={[styles.confirmation, { color: confirmationColor(confirmation) }]}>
              Client confirmation: {titleCase(confirmation)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.actions}>
          <ActionButton icon="eye-outline" label="Event" onPress={() => router.push(`/(tabs)/events/${item.id}` as any)} />
          {!cancelled && (
            <ActionButton icon="swap-horizontal-outline" label="Status" disabled={busy} onPress={() => setStatusTarget(item)} />
          )}
          {!!phone && <ActionButton icon="call-outline" label="Call" onPress={() => Linking.openURL(`tel:${phone}`)} />}
          {!!email && <ActionButton icon="mail-outline" label="Email" onPress={() => Linking.openURL(`mailto:${email}`)} />}
          {confirmation === 'rejected' && (
            <ActionButton icon="refresh-outline" label="Resend" disabled={busy} onPress={() => resendConfirmation(item)} />
          )}
          {!cancelled && (
            <ActionButton icon="close-circle-outline" label="Cancel" danger disabled={busy} onPress={() => cancelBooking(item)} />
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingState message="Loading bookings..." />;

  if (error && bookings.length === 0) {
    return (
      <View style={styles.errorWrap}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load bookings" message={error} />
        <AppButton title="Retry" onPress={() => { setLoading(true); fetchData(); }} style={{ marginHorizontal: 32 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client name or event..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!!error && <Text style={styles.inlineError}>{error} Pull down to retry.</Text>}

      <FlatList
        contentContainerStyle={styles.content}
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No bookings found"
            message={bookings.length === 0
              ? 'Events appear here once a deposit or full balance has been paid.'
              : 'Try adjusting your search or filter.'}
          />
        }
      />

      <Modal visible={!!statusTarget} transparent animationType="fade" onRequestClose={() => setStatusTarget(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setStatusTarget(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Client status</Text>
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => {
              const current = statusTarget ? bookingClientStatus(statusTarget) === value : false;
              return (
                <TouchableOpacity
                  key={value}
                  style={styles.option}
                  onPress={() => statusTarget && updateStatus(statusTarget, value)}
                >
                  <Text style={[styles.optionText, current && { color: Colors.primary, fontWeight: '700' }]}>{label}</Text>
                  {current && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <AppButton title="Close" variant="outline" onPress={() => setStatusTarget(null)} style={{ marginTop: 12 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function MoneyCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.moneyCell}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={[styles.moneyValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon, label, onPress, disabled, danger,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const color = danger ? Colors.error : Colors.primary;
  return (
    <TouchableOpacity
      style={[styles.actionBtn, danger && styles.actionBtnDanger, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorWrap: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.borderLight,
    borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },
  filterRow: { gap: 8, paddingTop: 10 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.textWhite },
  inlineError: { color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, fontSize: 13, textAlign: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 14, gap: 10 },
  cancelledCard: { opacity: 0.6 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  clientName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  eventName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },
  moneyRow: {
    flexDirection: 'row', marginTop: 10, backgroundColor: Colors.background,
    borderRadius: Radius.lg, paddingVertical: 8,
  },
  moneyCell: { flex: 1, alignItems: 'center' },
  moneyLabel: { fontSize: 11, color: Colors.textMuted },
  moneyValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  confirmation: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  actions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1,
    borderTopColor: Colors.borderLight, paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.lg, backgroundColor: Colors.primaryLight,
  },
  actionBtnDanger: { backgroundColor: Colors.errorLight },
  actionText: { fontSize: 13, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: 20, paddingBottom: 32,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  optionText: { fontSize: 15, color: Colors.textPrimary },
});
