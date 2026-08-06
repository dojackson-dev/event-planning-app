import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface TicketTier { id: string; name: string; price: number; quantity: number; quantity_sold: number; }
interface PromoterEvent {
  id: string; title: string; description?: string; event_date: string; start_time?: string; end_time?: string;
  venue_name?: string; venue_address?: string; city?: string; state?: string;
  status: 'draft' | 'published' | 'cancelled'; category?: string; ticket_tiers?: TicketTier[];
}

const fmt = (n?: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: '#F3F4F6', text: '#6B7280' },
  published: { label: 'Published', bg: '#D1FAE5', text: '#065F46' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', text: '#991B1B' },
};

export default function PromoterEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<PromoterEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiRequest<PromoterEvent>(`/promoter-events/${id}`);
      setEvent(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (status: 'draft' | 'published' | 'cancelled') => {
    setActioning(true);
    try {
      await apiRequest(`/promoter-events/${id}`, { method: 'PUT', body: { status } });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiRequest(`/promoter-events/${id}`, { method: 'DELETE' });
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Event' }} />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Stack.Screen options={{ title: 'Event' }} />
        <View style={styles.centered}><Text style={styles.errorText}>Event not found</Text></View>
      </>
    );
  }

  const meta = statusMeta[event.status] || statusMeta.draft;
  const eventDate = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{eventDate}{event.start_time ? ` · ${event.start_time}` : ''}</Text>
          {(event.venue_name || event.city) && (
            <Text style={styles.venueText}>{[event.venue_name, event.city, event.state].filter(Boolean).join(', ')}</Text>
          )}
        </View>

        <View style={styles.actionRow}>
          {event.status !== 'published' && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => updateStatus('published')} disabled={actioning}>
              <Ionicons name="megaphone-outline" size={16} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>Publish</Text>
            </TouchableOpacity>
          )}
          {event.status === 'published' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus('draft')} disabled={actioning}>
              <Ionicons name="eye-off-outline" size={16} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Unpublish</Text>
            </TouchableOpacity>
          )}
          {event.status !== 'cancelled' && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => updateStatus('cancelled')} disabled={actioning}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <View style={styles.card}><Text style={styles.notesText}>{event.description}</Text></View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ticket Tiers</Text>
          <View style={styles.card}>
            {(event.ticket_tiers || []).length === 0 && <Text style={styles.notesText}>No ticket tiers configured.</Text>}
            {(event.ticket_tiers || []).map((tier, idx) => (
              <View key={tier.id} style={[styles.tierRow, idx > 0 && styles.tierRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierSold}>{tier.quantity_sold || 0} / {tier.quantity} sold</Text>
                </View>
                <Text style={styles.tierPrice}>{fmt(tier.price)}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={styles.deleteBtnText}>Delete Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 16 },
  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, ...Shadow.md, marginBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { fontSize: 13, fontWeight: '700' },
  dateText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  venueText: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: 12,
  },
  actionBtnGreen: { backgroundColor: Colors.successLight },
  actionBtnRed: { backgroundColor: Colors.errorLight },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  notesText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  tierRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  tierName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  tierSold: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tierPrice: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error, marginTop: 8,
  },
  deleteBtnText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
