import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { Colors } from '@/lib/theme';
import NetEventForm, { EventFormValues, TierDraft } from '@/components/NetEventForm';

// POST /promoter-events (CreatePromoterEventDto). Mirrors web promoter/events/new.
export default function NewPromoterEventScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [payoutsActive, setPayoutsActive] = useState(true);

  useEffect(() => {
    apiRequest<any>('/promoter/profile')
      .then((p) => setPayoutsActive(p?.stripe_connect_status === 'active'))
      .catch(() => setPayoutsActive(false));
  }, []);

  const submit = async (v: EventFormValues, tiers: TierDraft[]) => {
    setSaving(true);
    try {
      const opt = (s: string) => (s.trim() ? s.trim() : undefined);
      const created = await apiRequest<{ id: string }>('/promoter-events', {
        method: 'POST',
        body: {
          title: v.title.trim(),
          description: opt(v.description),
          event_date: v.event_date.trim(),
          start_time: opt(v.start_time),
          end_time: opt(v.end_time),
          venue_name: opt(v.venue_name),
          venue_address: opt(v.venue_address),
          city: opt(v.city),
          state: opt(v.state),
          zip_code: opt(v.zip_code),
          category: opt(v.category),
          age_restriction: opt(v.age_restriction),
          sales_tax_rate: v.sales_tax_rate.trim() === '' ? undefined : Number(v.sales_tax_rate),
          image_url: opt(v.image_url),
          status: v.published ? 'published' : 'draft',
          ticket_tiers: tiers.length
            ? tiers.map((t) => ({
                name: t.name.trim(),
                price: parseFloat(t.price) || 0,
                quantity: parseInt(t.quantity, 10) || 0,
                description: opt(t.description),
              }))
            : undefined,
        },
      });
      router.replace(`/(promoter)/events/${created.id}` as any);
    } catch (err: any) {
      Alert.alert('Could not create event', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NetEventForm submitLabel="Create Event" saving={saving} withTiers paidNeedsPayouts={!payoutsActive} onSubmit={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
});
