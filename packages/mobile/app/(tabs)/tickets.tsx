import { useState } from 'react';
import {
  View, Text, SectionList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/lib/theme';
import { MOCK_TICKETS } from '@/lib/mockData';
import { Ticket } from '@/types/ticket';
import TicketCard from '@/components/TicketCard';
import EmptyState from '@/components/EmptyState';

export default function TicketsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const now = Date.now();
  const upcoming = MOCK_TICKETS.filter(
    (t) => t.status === 'active' && new Date(t.eventDate).getTime() > now
  );
  const past = MOCK_TICKETS.filter(
    (t) => t.status !== 'active' || new Date(t.eventDate).getTime() <= now
  );

  const data = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {data.length === 0 ? (
        <EmptyState
          icon="ticket-outline"
          title={tab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'}
          message={tab === 'upcoming' ? 'Tickets you purchase will appear here' : undefined}
        />
      ) : (
        <SectionList
          contentContainerStyle={styles.list}
          sections={[{ data }]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              onPress={() =>
                router.push({ pathname: '/tickets/[ticketId]', params: { ticketId: item.id } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
});
