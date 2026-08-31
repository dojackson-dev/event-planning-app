import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import BookingRequestCard from '@/components/BookingRequestCard';
import type { VendorBookingRequest } from '@/types/vendorBooking';

export default function VendorBookingRequestsScreen() {
  const [requests, setRequests] = useState<VendorBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<VendorBookingRequest[]>('/vendors/booking-requests/mine');
      setRequests(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load booking requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const respond = async (id: string, status: 'confirmed' | 'declined') => {
    setRespondingId(id);
    try {
      await apiRequest(`/vendors/booking-requests/${id}`, { method: 'PUT', body: { status } });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update the booking request');
    } finally {
      setRespondingId(null);
    }
  };

  const confirmDecline = (id: string) => {
    Alert.alert('Decline Request?', 'This will let the client know you cannot take this booking.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => respond(id, 'declined') },
    ]);
  };

  if (loading) {
    return <LoadingState message="Loading booking requests..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load requests" message={error} />
        <View style={styles.retryWrap}>
          <AppButton title="Try Again" onPress={load} variant="outline" />
        </View>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="mail-unread-outline"
          title="No booking requests yet"
          message="When a client requests to book your services, it will show up here."
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={requests}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      renderItem={({ item }) => (
        <BookingRequestCard
          request={item}
          busy={respondingId === item.id}
          onAccept={item.status === 'pending' ? () => respond(item.id, 'confirmed') : undefined}
          onDecline={item.status === 'pending' ? () => confirmDecline(item.id) : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  retryWrap: { paddingHorizontal: 32, marginTop: -20 },
});
