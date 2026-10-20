import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AppButton from '@/components/AppButton';
import SectionHeader from '@/components/SectionHeader';
import NetField from '@/components/NetField';
import NetNavRow from '@/components/NetNavRow';
import { fmtDate, fmtMoney, fmtTime, num } from '@/components/netFormat';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  description?: string | null;
}

interface PromoterEventDetail {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  venue_address?: string | null;
  address?: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  age_restriction?: string | null;
  image_url: string | null;
  status: 'draft' | 'published' | 'cancelled';
  ticket_tiers: TicketTier[];
}

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: Colors.borderLight, text: Colors.textSecondary, label: 'Draft' },
  published: { bg: Colors.successLight, text: Colors.successText, label: 'Published' },
  cancelled: { bg: Colors.errorLight, text: Colors.errorText, label: 'Cancelled' },
};

const FRONTEND_URL = 'https://eventecos.com';

type TierForm = { id?: string; name: string; price: string; quantity: string; description: string };
const blankTier: TierForm = { name: '', price: '', quantity: '', description: '' };

export default function PromoterEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<PromoterEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tierForm, setTierForm] = useState<TierForm | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setEvent(await apiRequest<PromoterEventDetail>(`/promoter-events/${id}`));
    } catch (err: any) {
      setError(err?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (status: 'draft' | 'published' | 'cancelled') => {
    setBusy(true);
    try {
      await apiRequest(`/promoter-events/${id}`, { method: 'PUT', body: { status } });
      await load();
    } catch (err: any) {
      Alert.alert('Could not update event', err?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () =>
    Alert.alert('Cancel this event?', 'It will be hidden from buyers. Existing tickets are not refunded automatically.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Event', style: 'destructive', onPress: () => setStatus('cancelled') },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete this event?', 'This permanently deletes the event and its ticket tiers.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiRequest(`/promoter-events/${id}`, { method: 'DELETE' });
            router.replace('/(promoter)/events' as any);
          } catch (err: any) {
            Alert.alert('Could not delete', err?.message || 'Please try again.');
            setBusy(false);
          }
        },
      },
    ]);

  const saveTier = async () => {
    if (!tierForm) return;
    const price = parseFloat(tierForm.price);
    const quantity = parseInt(tierForm.quantity, 10);
    if (!tierForm.name.trim() || !(price >= 0) || !(quantity > 0)) {
      Alert.alert('Ticket tier', 'Name, a price (0 for free) and a quantity are required.');
      return;
    }
    const body = {
      name: tierForm.name.trim(),
      price,
      quantity,
      description: tierForm.description.trim() || undefined,
    };
    setBusy(true);
    try {
      if (tierForm.id) await apiRequest(`/promoter-events/tiers/${tierForm.id}`, { method: 'PUT', body });
      else await apiRequest(`/promoter-events/${id}/tiers`, { method: 'POST', body });
      setTierForm(null);
      await load();
    } catch (err: any) {
      Alert.alert('Could not save tier', err?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const deleteTier = (tier: TicketTier) => {
    if (num(tier.quantity_sold) > 0) {
      Alert.alert('Tier has sales', 'Tiers with sold tickets cannot be deleted.');
      return;
    }
    Alert.alert('Delete tier?', tier.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/promoter-events/tiers/${tier.id}`, { method: 'DELETE' });
            await load();
          } catch (err: any) {
            Alert.alert('Could not delete tier', err?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Loading event..." />;

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'Event not found'}</Text>
        <AppButton title="Retry" onPress={() => { setLoading(true); load(); }} style={styles.retryBtn} />
      </View>
    );
  }

  const meta = STATUS_META[event.status] || STATUS_META.draft;
  const tiers = event.ticket_tiers || [];
  const totalSold = tiers.reduce((s, t) => s + num(t.quantity_sold), 0);
  const totalCapacity = tiers.reduce((s, t) => s + num(t.quantity), 0);
  const totalRevenue = tiers.reduce((s, t) => s + num(t.quantity_sold) * num(t.price), 0);
  const address = event.venue_address || event.address;
  const location = [event.venue_name, address, event.city, event.state].filter(Boolean).join(', ');
  const time = [fmtTime(event.start_time), fmtTime(event.end_time)].filter(Boolean).join(' – ');

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: event.title }} />

        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>{event.title}</Text>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{fmtDate(event.event_date)}{time ? ` · ${time}` : ''}</Text>
          </View>
          {!!location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{location}</Text>
            </View>
          )}
          {!!(event.category || event.age_restriction) && (
            <View style={styles.metaRow}>
              <Ionicons name="pricetag-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{[event.category, event.age_restriction].filter(Boolean).join(' · ')}</Text>
            </View>
          )}
          {!!event.description && <Text style={styles.description}>{event.description}</Text>}
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.actionCell}>
            <AppButton title="Edit" variant="outline" onPress={() => router.push({ pathname: '/(promoter)/events/edit', params: { id } } as any)} />
          </View>
          {event.status !== 'published' && event.status !== 'cancelled' && (
            <View style={styles.actionCell}>
              <AppButton title="Publish" onPress={() => setStatus('published')} loading={busy} style={styles.purple} />
            </View>
          )}
          {event.status === 'published' && (
            <View style={styles.actionCell}>
              <AppButton title="Unpublish" variant="outline" onPress={() => setStatus('draft')} loading={busy} />
            </View>
          )}
          {event.status === 'cancelled' && (
            <View style={styles.actionCell}>
              <AppButton title="Reopen as Draft" variant="outline" onPress={() => setStatus('draft')} loading={busy} />
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalSold}{totalCapacity ? `/${totalCapacity}` : ''}</Text>
            <Text style={styles.statLabel}>Tickets Sold</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{fmtMoney(totalRevenue)}</Text>
            <Text style={styles.statLabel}>Ticket Revenue</Text>
          </View>
        </View>

        <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="people-outline" title="Attendees & Check-in" subtitle="Search guests, check in tickets, send comps" onPress={() => router.push({ pathname: '/(promoter)/events/attendees', params: { id } } as any)} />
        <NetNavRow tint={Colors.purple} tintBg={Colors.purpleLight} icon="diamond-outline" title="VIP Packages & Orders" subtitle="Tables, bottle service and VIP check-in" onPress={() => router.push({ pathname: '/(promoter)/events/vip', params: { id } } as any)} />
        {event.status === 'published' && (
          <NetNavRow
            tint={Colors.purple}
            tintBg={Colors.purpleLight}
            icon="share-outline"
            title="Share Event"
            subtitle="Send the ticket page to your audience"
            onPress={() => Share.share({ message: `${event.title} — get tickets: ${FRONTEND_URL}/events/${event.id}` }).catch(() => {})}
          />
        )}

        <SectionHeader title="Ticket Tiers" action={{ label: '+ Add Tier', onPress: () => setTierForm({ ...blankTier }) }} />
        {tiers.length === 0 ? (
          <View style={styles.emptyTiers}>
            <Text style={styles.emptyTiersText}>No ticket tiers set up for this event</Text>
          </View>
        ) : (
          tiers.map((tier) => (
            <View key={tier.id} style={styles.tierCard}>
              <View style={styles.tierTop}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierPrice}>{num(tier.price) === 0 ? 'Free' : fmtMoney(tier.price)}</Text>
              </View>
              {!!tier.description && <Text style={styles.tierMeta}>{tier.description}</Text>}
              <Text style={styles.tierMeta}>
                {num(tier.quantity_sold)} / {num(tier.quantity)} sold · {fmtMoney(num(tier.quantity_sold) * num(tier.price))} revenue
              </Text>
              <View style={styles.tierActions}>
                <TouchableOpacity
                  onPress={() => setTierForm({ id: tier.id, name: tier.name, price: String(tier.price), quantity: String(tier.quantity), description: tier.description || '' })}
                  hitSlop={8}
                >
                  <Text style={styles.link}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTier(tier)} hitSlop={8}>
                  <Text style={[styles.link, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.danger}>
          {event.status !== 'cancelled' && (
            <AppButton title="Cancel Event" variant="outline" onPress={confirmCancel} disabled={busy} style={styles.dangerBtn} textStyle={{ color: Colors.error }} />
          )}
          {totalSold === 0 && (
            <AppButton title="Delete Event" variant="ghost" onPress={confirmDelete} disabled={busy} textStyle={{ color: Colors.error }} />
          )}
        </View>
      </ScrollView>

      <Modal visible={!!tierForm} animationType="slide" transparent onRequestClose={() => setTierForm(null)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{tierForm?.id ? 'Edit Ticket Tier' : 'New Ticket Tier'}</Text>
            <NetField label="Name" value={tierForm?.name || ''} onChangeText={(v) => setTierForm((p) => p && { ...p, name: v })} placeholder="General Admission" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}><NetField label="Price ($)" value={tierForm?.price || ''} onChangeText={(v) => setTierForm((p) => p && { ...p, price: v })} keyboardType="decimal-pad" placeholder="0 = free" /></View>
              <View style={{ flex: 1 }}><NetField label="Quantity" value={tierForm?.quantity || ''} onChangeText={(v) => setTierForm((p) => p && { ...p, quantity: v })} keyboardType="number-pad" /></View>
            </View>
            <NetField label="Description" value={tierForm?.description || ''} onChangeText={(v) => setTierForm((p) => p && { ...p, description: v })} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}><AppButton title="Cancel" variant="outline" onPress={() => setTierForm(null)} /></View>
              <View style={{ flex: 1 }}><AppButton title="Save" onPress={saveTier} loading={busy} style={styles.purple} /></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 32 },
  purple: { backgroundColor: Colors.purple },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 12, gap: 8, ...Shadow.md },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  description: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionCell: { flex: 1 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, alignItems: 'center', gap: 4, ...Shadow.sm },
  statNumber: { fontSize: 20, fontWeight: '800', color: Colors.purple },
  statLabel: { fontSize: 12, color: Colors.textSecondary },

  emptyTiers: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, alignItems: 'center', marginBottom: 12 },
  emptyTiersText: { fontSize: 14, color: Colors.textMuted },

  tierCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, gap: 4, ...Shadow.sm },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  tierPrice: { fontSize: 15, fontWeight: '700', color: Colors.purple },
  tierMeta: { fontSize: 12, color: Colors.textMuted },
  tierActions: { flexDirection: 'row', gap: 20, marginTop: 6 },
  link: { fontSize: 13, fontWeight: '600', color: Colors.purple },

  danger: { marginTop: 16, gap: 4 },
  dangerBtn: { borderColor: Colors.error },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
});
