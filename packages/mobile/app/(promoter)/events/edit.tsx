import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import NetEventForm, { EventFormValues } from '@/components/NetEventForm';

// PUT /promoter-events/:id (UpdatePromoterEventDto). Mirrors the edit section of web promoter/events/[id].
export default function EditPromoterEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [status, setStatus] = useState('draft');
  const [payoutsActive, setPayoutsActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiRequest<any>(`/promoter-events/${id}`),
      apiRequest<any>('/promoter/profile').catch(() => null),
    ])
      .then(([e, p]) => {
        setStatus(e.status);
        setPayoutsActive(p?.stripe_connect_status === 'active');
        setInitial({
          title: e.title || '',
          description: e.description || '',
          event_date: e.event_date || '',
          start_time: (e.start_time || '').slice(0, 5),
          end_time: (e.end_time || '').slice(0, 5),
          venue_name: e.venue_name || '',
          venue_address: e.venue_address || e.address || '',
          city: e.city || '',
          state: e.state || '',
          zip_code: e.zip_code || '',
          category: e.category || '',
          age_restriction: e.age_restriction || '',
          sales_tax_rate: e.sales_tax_rate != null ? String(e.sales_tax_rate) : '',
          image_url: e.image_url || '',
          published: e.status === 'published',
        });
      })
      .catch((err) => setError(err?.message || 'Failed to load event.'));
  }, [id]);

  if (error) return <EmptyState icon="alert-circle-outline" title="Couldn't load event" message={error} />;
  if (!initial) return <LoadingState message="Loading event..." />;

  const submit = async (v: EventFormValues) => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: v.title.trim(),
        description: v.description.trim(),
        event_date: v.event_date.trim(),
        start_time: v.start_time.trim() || null,
        end_time: v.end_time.trim() || null,
        venue_name: v.venue_name.trim(),
        venue_address: v.venue_address.trim(),
        city: v.city.trim(),
        state: v.state.trim(),
        zip_code: v.zip_code.trim(),
        category: v.category.trim(),
        age_restriction: v.age_restriction.trim(),
        image_url: v.image_url.trim(),
      };
      if (v.sales_tax_rate.trim() !== '') body.sales_tax_rate = Number(v.sales_tax_rate);
      // Never silently revive a cancelled event: only send status when the toggle changed.
      if (v.published !== (status === 'published')) body.status = v.published ? 'published' : 'draft';
      await apiRequest(`/promoter-events/${id}`, { method: 'PUT', body });
      router.back();
    } catch (err: any) {
      Alert.alert('Could not save event', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NetEventForm initial={initial} submitLabel="Save Changes" saving={saving} paidNeedsPayouts={!payoutsActive} onSubmit={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
});
