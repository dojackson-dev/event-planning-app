import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';

interface Booking {
  id: string;
  status: string;
  client_status?: string;
  payment_status?: string;
  total_amount?: number;
  created_at: string;
  name?: string;
  date?: string;
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('event')
        .select('id, name, date, status, client_status, payment_status, total_amount, created_at')
        .eq('owner_id', user.id)
        .not('intake_form_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingStatus}>{(item.client_status || item.status || '').toUpperCase()}</Text>
              <Text style={styles.bookingPrice}>${item.total_amount || 0}</Text>
            </View>
            <Text style={styles.bookingDate}>
              {item.name ? `${item.name} — ` : ''}{new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
