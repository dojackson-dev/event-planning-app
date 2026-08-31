import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EmptyState from '@/components/EmptyState';

const FRONTEND_URL = 'https://dovenuesuite.com';

interface ArtistBill {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  public_token: string | null;
  issue_date: string;
  due_date: string;
  created_at: string;
  artist_account_id: string;
  artist_accounts?: { artist_name?: string | null; stage_name?: string | null } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: Colors.borderLight,  text: Colors.textSecondary, dot: Colors.textMuted },
  sent:      { bg: Colors.infoLight,    text: Colors.infoText,      dot: Colors.info },
  viewed:    { bg: Colors.purpleLight,  text: Colors.purpleText,    dot: Colors.purple },
  paid:      { bg: Colors.successLight, text: Colors.successText,   dot: Colors.success },
  overdue:   { bg: Colors.errorLight,   text: Colors.errorText,     dot: Colors.error },
  cancelled: { bg: Colors.borderLight,  text: Colors.textMuted,     dot: Colors.textMuted },
};

const statusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export default function PromoterArtistBillsScreen() {
  const [bills, setBills] = useState<ArtistBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest<ArtistBill[]>('/promoter-bookings/artist-invoices/mine');
      setBills(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load artist bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const openInvoice = (bill: ArtistBill) => {
    if (!bill.public_token) {
      Alert.alert('Unavailable', 'This invoice does not have a payment link yet.');
      return;
    }
    Linking.openURL(`${FRONTEND_URL}/pay/invoice/${bill.public_token}`).catch(() => {
      Alert.alert('Error', 'Could not open the invoice.');
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={bills}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
      renderItem={({ item }) => {
        const ss = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
        const artistName = item.artist_accounts?.stage_name || item.artist_accounts?.artist_name || 'Artist';
        return (
          <TouchableOpacity style={styles.card} onPress={() => openInvoice(item)} activeOpacity={0.75}>
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>
                <Text style={styles.dateText}>Due {item.due_date}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.amount}>${Number(item.total_amount).toFixed(2)}</Text>
                <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                  <View style={[styles.dot, { backgroundColor: ss.dot }]} />
                  <Text style={[styles.badgeText, { color: ss.text }]}>{statusLabel(item.status)}</Text>
                </View>
              </View>
            </View>
            {item.status !== 'paid' && item.status !== 'cancelled' && (
              <View style={styles.payRow}>
                <Ionicons name="open-outline" size={14} color={Colors.purple} />
                <Text style={styles.payText}>Tap to view & pay</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="receipt-outline"
          title="No artist bills"
          message="Invoices sent by artists you've booked will show up here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: Colors.purple, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full },
  retryText: { color: '#FFF', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 12,
    ...Shadow.sm,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: 8 },
  cardRight: { alignItems: 'flex-end' },
  invoiceNum: { fontSize: 13, fontWeight: '700', color: Colors.purple, marginBottom: 2 },
  artistName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  payText: { fontSize: 12, fontWeight: '600', color: Colors.purple },
});
