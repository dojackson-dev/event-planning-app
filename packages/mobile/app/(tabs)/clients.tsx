import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Shadow, Radius } from '@/lib/theme';

interface Client {
  id: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  event_type?: string;
  event_date?: string;
  guest_count?: number;
  status: string;
  created_at: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  new:       { bg: '#DBEAFE', text: '#1E40AF' },
  contacted: { bg: '#FEF3C7', text: '#92400E' },
  converted: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(clients);
    } else {
      const q = search.toLowerCase();
      setFiltered(clients.filter(c =>
        c.contact_name.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.event_type?.toLowerCase().includes(q)
      ));
    }
  }, [search, clients]);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('intake_forms')
        .select('id, contact_name, contact_email, contact_phone, event_type, event_date, guest_count, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchClients(); };

  const formatEventType = (type?: string) => {
    if (!type) return '';
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} onPress={() => setSearch('')} />
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const ss = statusColors[item.status] || { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.contact_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardMain}>
                  <Text style={styles.clientName} numberOfLines={1}>{item.contact_name}</Text>
                  {item.event_type && (
                    <Text style={styles.eventType}>{formatEventType(item.event_type)}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                  <Text style={[styles.badgeText, { color: ss.text }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                {item.event_date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>
                      {new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                )}
                {item.contact_email && (
                  <View style={styles.metaItem}>
                    <Ionicons name="mail-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>{item.contact_email}</Text>
                  </View>
                )}
                {item.contact_phone && (
                  <View style={styles.metaItem}>
                    <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{item.contact_phone}</Text>
                  </View>
                )}
                {item.guest_count && (
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{item.guest_count} guests</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{search ? 'No results found' : 'No clients yet'}</Text>
            <Text style={styles.emptyText}>Client intake forms appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: Radius.lg,
    paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  cardMain: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
