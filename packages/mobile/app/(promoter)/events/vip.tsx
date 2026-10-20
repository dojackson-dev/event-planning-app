import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import NetChips from '@/components/NetChips';
import { fmtMoney, num, titleCase, toList } from '@/components/netFormat';

interface VipPackage {
  id: string;
  name: string;
  package_type?: string;
  description?: string | null;
  price: number;
  capacity?: number;
  included_tickets?: number;
  table_label?: string | null;
  inventory?: number;
  inventory_sold?: number;
  status?: string;
  vip_sections?: { name: string } | null;
}

interface ServiceOrder {
  id: string;
  quantity: number;
  status: string;
  special_request?: string | null;
  vip_service_items?: { name: string; price: number } | null;
}

interface VipOrder {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  total_price: number;
  payment_status: string;
  check_in_status: string;
  guests_checked_in: number;
  notes?: string | null;
  qr_code: string;
  vip_packages: { name: string; capacity: number; table_label?: string | null } | null;
  vip_guest_passes?: { id: string; guest_name: string | null; status: string }[];
  vip_service_orders?: ServiceOrder[];
}

const SERVICE_STATUSES = ['ordered', 'confirmed', 'preparing', 'delivered', 'cancelled'];

const CHECK_IN_COLORS: Record<string, { bg: string; fg: string }> = {
  not_arrived: { bg: Colors.borderLight, fg: Colors.textSecondary },
  partial: { bg: Colors.warningLight, fg: Colors.warningText },
  checked_in: { bg: Colors.successLight, fg: Colors.successText },
};

// Read-mostly VIP view: packages, orders, service-order status. Package/layout
// editing and payments stay on the web dashboard.
export default function PromoterVipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<'packages' | 'orders'>('orders');
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [orders, setOrders] = useState<VipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, o] = await Promise.all([
        apiRequest<any>(`/vip/events/${id}/packages`),
        apiRequest<any>(`/vip/events/${id}/orders`),
      ]);
      setPackages(toList<VipPackage>(p, 'packages'));
      setOrders(toList<VipOrder>(o, 'orders'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load VIP data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setServiceStatus = async (serviceOrderId: string, status: string) => {
    setUpdating(serviceOrderId);
    try {
      await apiRequest(`/vip/service-orders/${serviceOrderId}`, { method: 'PUT', body: { status } });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update the service order.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <LoadingState message="Loading VIP..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load VIP" message={error} />
        <View style={styles.retry}><AppButton title="Try Again" variant="outline" onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  const paid = orders.filter((o) => o.payment_status === 'paid');
  const revenue = paid.reduce((s, o) => s + num(o.total_price), 0);
  const checkedIn = orders.filter((o) => o.check_in_status === 'checked_in').length;

  return (
    <View style={styles.container}>
      <NetChips
        value={tab}
        onChange={(v) => setTab(v as 'packages' | 'orders')}
        activeColor={Colors.purple}
        options={[
          { value: 'orders', label: `Orders (${orders.length})` },
          { value: 'packages', label: `Packages (${packages.length})` },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.purple} />}
      >
        {tab === 'orders' && (
          <>
            <View style={styles.stats}>
              <View style={[styles.stat, Shadow.sm]}><Text style={styles.statNum}>{paid.length}</Text><Text style={styles.statLabel}>Paid</Text></View>
              <View style={[styles.stat, Shadow.sm]}><Text style={styles.statNum}>{checkedIn}</Text><Text style={styles.statLabel}>Checked in</Text></View>
              <View style={[styles.stat, Shadow.sm]}><Text style={styles.statNum}>{fmtMoney(revenue, 0)}</Text><Text style={styles.statLabel}>Revenue</Text></View>
            </View>
            {orders.length === 0 ? (
              <EmptyState icon="diamond-outline" title="No VIP orders yet" message="Orders appear here after guests purchase a package." />
            ) : (
              orders.map((o) => {
                const open = expanded === o.id;
                const ci = CHECK_IN_COLORS[o.check_in_status] || CHECK_IN_COLORS.not_arrived;
                return (
                  <View key={o.id} style={[styles.card, Shadow.sm]}>
                    <TouchableOpacity onPress={() => setExpanded(open ? null : o.id)} activeOpacity={0.8}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>{o.buyer_name || o.buyer_email}</Text>
                          <Text style={styles.sub}>
                            {o.vip_packages?.name || 'VIP'}{o.vip_packages?.table_label ? ` · ${o.vip_packages.table_label}` : ''} · {fmtMoney(o.total_price)}
                          </Text>
                          <Text style={styles.sub}>
                            {titleCase(o.payment_status)} · {num(o.guests_checked_in)}{o.vip_packages?.capacity ? `/${o.vip_packages.capacity}` : ''} guests in
                          </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: ci.bg }]}>
                          <Text style={[styles.badgeText, { color: ci.fg }]}>{titleCase(o.check_in_status)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {open && (
                      <View style={styles.detail}>
                        {!!o.buyer_phone && (
                          <TouchableOpacity style={styles.line} onPress={() => Linking.openURL(`tel:${o.buyer_phone}`)}>
                            <Ionicons name="call-outline" size={14} color={Colors.purple} /><Text style={styles.link}>{o.buyer_phone}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.line} onPress={() => Linking.openURL(`mailto:${o.buyer_email}`)}>
                          <Ionicons name="mail-outline" size={14} color={Colors.purple} /><Text style={styles.link}>{o.buyer_email}</Text>
                        </TouchableOpacity>
                        <Text style={styles.sub}>VIP code: {o.qr_code}</Text>
                        {!!o.notes && <Text style={styles.sub}>Notes: {o.notes}</Text>}
                        {(o.vip_guest_passes || []).length > 0 && (
                          <>
                            <Text style={styles.section}>Guests</Text>
                            {o.vip_guest_passes!.map((g) => (
                              <Text key={g.id} style={styles.sub}>• {g.guest_name || 'Guest'} — {titleCase(g.status)}</Text>
                            ))}
                          </>
                        )}
                        {(o.vip_service_orders || []).length > 0 && (
                          <>
                            <Text style={styles.section}>Service orders</Text>
                            {o.vip_service_orders!.map((s) => (
                              <View key={s.id} style={styles.service}>
                                <Text style={styles.name}>{num(s.quantity)} × {s.vip_service_items?.name || 'Item'}</Text>
                                {!!s.special_request && <Text style={styles.sub}>“{s.special_request}”</Text>}
                                <NetChips
                                  value={s.status}
                                  onChange={(v) => updating !== s.id && v !== s.status && setServiceStatus(s.id, v)}
                                  activeColor={Colors.purple}
                                  options={SERVICE_STATUSES.map((x) => ({ value: x, label: titleCase(x) }))}
                                />
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'packages' && (
          packages.length === 0 ? (
            <EmptyState icon="diamond-outline" title="No VIP packages" message="Create VIP packages from the web dashboard to start selling tables and bottle service." />
          ) : (
            packages.map((p) => {
              const sold = num(p.inventory_sold);
              const inv = num(p.inventory);
              return (
                <View key={p.id} style={[styles.card, Shadow.sm]}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{p.name}</Text>
                      <Text style={styles.sub}>
                        {titleCase(p.package_type)}{p.vip_sections?.name ? ` · ${p.vip_sections.name}` : ''}{p.table_label ? ` · ${p.table_label}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.price}>{fmtMoney(p.price)}</Text>
                  </View>
                  {!!p.description && <Text style={styles.sub}>{p.description}</Text>}
                  <Text style={styles.sub}>
                    {sold}{inv ? ` / ${inv}` : ''} sold · seats {num(p.capacity)} · {num(p.included_tickets)} ticket{num(p.included_tickets) === 1 ? '' : 's'} included
                  </Text>
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  retry: { paddingHorizontal: 32, marginTop: -20 },
  content: { padding: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.purple },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', color: Colors.purple },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  detail: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontSize: 13, color: Colors.purple },
  section: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginTop: 8, textTransform: 'uppercase' },
  service: { backgroundColor: Colors.background, borderRadius: Radius.md, paddingTop: 8, marginTop: 4, paddingHorizontal: 0 },
});
