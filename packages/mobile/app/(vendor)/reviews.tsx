import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import AppButton from '@/components/AppButton';
import { fmtDate, toList } from '@/components/netFormat';

interface Review {
  id: string;
  rating: number;
  review_text?: string | null;
  created_at: string;
}

const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(Math.max(0, 5 - Math.round(n)));

export default function VendorReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const me = await apiRequest<{ id: string }>('/vendors/account/me');
      const data = await apiRequest<any>(`/vendors/${me.id}/reviews`);
      setReviews(toList<Review>(data, 'reviews'));
    } catch (err: any) {
      setError(err?.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingState message="Loading reviews..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load reviews" message={error} />
        <View style={styles.retry}><AppButton title="Try Again" variant="outline" onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length : 0;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={reviews}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      ListHeaderComponent={
        reviews.length > 0 ? (
          <View style={[styles.summary, Shadow.sm]}>
            <Text style={styles.avg}>{avg.toFixed(1)}</Text>
            <View>
              <Text style={styles.stars}>{stars(avg)}</Text>
              <Text style={styles.count}>{reviews.length} review{reviews.length === 1 ? '' : 's'}</Text>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.cardTop}>
            <Text style={styles.stars}>{stars(item.rating)}</Text>
            <Text style={styles.date}>{fmtDate(item.created_at)}</Text>
          </View>
          {!!item.review_text && <Text style={styles.text}>“{item.review_text}”</Text>}
        </View>
      )}
      ListEmptyComponent={
        <EmptyState icon="star-outline" title="No reviews yet" message="Reviews appear here once event owners rate your services." />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  retry: { paddingHorizontal: 32, marginTop: -20 },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: 16, marginBottom: 14,
  },
  avg: { fontSize: 34, fontWeight: '800', color: Colors.warning },
  stars: { fontSize: 18, color: Colors.warning },
  count: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 10, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: Colors.textMuted },
  text: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
});
