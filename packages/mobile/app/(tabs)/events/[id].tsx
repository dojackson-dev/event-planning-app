import { useState, Fragment, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface EventDetail {
  id: string;
  name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  location?: string;
  status?: string;
  intake_form_id?: string;
  intake_form?: {
    id?: string;
    event_type?: string;    event_name?: string;    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    guest_count?: number;
    status?: string;
  } | null;
  booking?: {
    id?: string;
    client_status?: string;
    total_amount?: number;
    deposit_amount?: number;
  } | null;
}

interface Invoice {
  id: string;
  status: string;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  intake_form_id?: string | null;
  booking_id?: string | null;
  event_id?: string | null;
}

interface EstimateSummary {
  id: string;
  estimate_number: string;
  status: string;
  total_amount: number;
  expiration_date: string;
  intake_form_id?: string | null;
}

const EST_STATUS_META: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#F3F4F6', text: '#6B7280' },
  sent:      { bg: '#DBEAFE', text: '#1E40AF' },
  viewed:    { bg: '#EDE9FE', text: '#5B21B6' },
  approved:  { bg: '#D1FAE5', text: '#065F46' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B' },
  expired:   { bg: '#FEF3C7', text: '#92400E' },
  converted: { bg: '#D1FAE5', text: '#065F46' },
};

const statusMeta: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: '#DBEAFE', text: '#1E40AF' },
  confirmed:  { bg: '#D1FAE5', text: '#065F46' },
  completed:  { bg: '#F3F4F6', text: '#6B7280' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
  draft:      { bg: '#F3F4F6', text: '#6B7280' },
};

const formatTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatCurrency = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n) : '—';

const formatEventType = (type?: string) =>
  type ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch event + intake_form (has FK) separately from booking (no FK in schema)
      const [eventRes, invoiceRes, estimateRes] = await Promise.all([
        supabase
          .from('event')
          .select(`
            id, name, date, start_time, end_time, venue, location,
            status, intake_form_id,
            intake_form:intake_forms!intake_form_id(
              id, event_type, event_name, contact_name, contact_email, contact_phone,
              guest_count, status
            )
          `)
          .eq('id', id)
          .eq('owner_id', user.id)
          .single(),
        supabase
          .from('invoices')
          .select('id, status, total_amount, amount_due, amount_paid, intake_form_id, booking_id, event_id')
          .eq('owner_id', user.id),
        supabase
          .from('estimates')
          .select('id, estimate_number, status, total_amount, expiration_date, intake_form_id')
          .eq('owner_id', user.id),
      ]);

      if (eventRes.error) throw eventRes.error;

      const eventData = eventRes.data as unknown as EventDetail;

      // Fetch booking by event_id
      const { data: bookingData } = await supabase
        .from('booking')
        .select('id, client_status, total_amount, deposit_amount')
        .eq('event_id', id)
        .maybeSingle();
      if (bookingData) {
        eventData.booking = bookingData;
      }

      setEvent(eventData);

      // Match invoices to this event via event_id, booking_id, or intake_form_id
      const allInvoices: Invoice[] = invoiceRes.data || [];
      const matched = allInvoices.filter((inv: any) =>
        inv.event_id === id ||
        (bookingData?.id && inv.booking_id === bookingData.id) ||
        (eventData.intake_form_id && inv.intake_form_id === eventData.intake_form_id)
      );
      setInvoices(matched);

      // Match estimates to this event via intake_form_id
      const allEstimates: EstimateSummary[] = estimateRes.data || [];
      const matchedEstimates = allEstimates.filter((est) =>
        eventData.intake_form_id && est.intake_form_id === eventData.intake_form_id
      );
      setEstimates(matchedEstimates);
    } catch (err: any) {
      console.error('Error loading event:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase.from('event').delete().eq('id', id);
              if (error) throw error;
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message);
              setDeleting(false);
            }
          },
        },
      ]
    );
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
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </>
    );
  }

  const clientName = event.intake_form?.contact_name;
  const eventName = event.intake_form?.event_name || formatEventType(event.intake_form?.event_type) || event.name;
  const sm = statusMeta[event.status || ''] || statusMeta.draft;
  const dateObj = new Date(event.date + 'T00:00:00');
  const clientStatus = event.booking?.client_status || event.intake_form?.status || '';

  // ---- Progress bar computation ----
  const invoiceSent = invoices.some(i => ['sent', 'viewed', 'partial', 'paid', 'overdue'].includes(i.status));
  const depositPaid = ['deposit_paid', 'booked', 'completed'].includes(clientStatus);
  const isComplete = clientStatus === 'completed';
  const hasEstimate = estimates.length > 0;
  const hasApprovedEstimate = estimates.some(e => ['approved', 'converted'].includes(e.status));

  const steps = [
    { label: 'Intake',   done: !!event.intake_form_id },
    { label: 'Estimate', done: hasEstimate },
    { label: 'Invoice',  done: invoiceSent },
    { label: 'Deposit',  done: depositPaid },
    { label: 'Complete', done: isComplete },
  ];
  const currentStep = steps.findIndex(s => !s.done);

  const nextAction = (() => {
    if (!event.intake_form_id) return null;
    if (!hasEstimate) return { label: 'Create Estimate →', route: `/(tabs)/estimates/new?eventId=${id}` };
    if (!invoiceSent && hasApprovedEstimate) return { label: 'Create Invoice →', route: `/(tabs)/invoices/new?eventId=${id}` };
    return null;
  })();

  return (
    <>
      <Stack.Screen options={{ title: clientName || eventName, headerBackTitle: 'Events' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header card */}
        <View style={styles.headerCard}>
          {clientName && <Text style={styles.headerClient}>{clientName}</Text>}
          <Text style={styles.headerTitle}>{eventName}</Text>
          <View style={styles.headerRow}>
            <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
              <Text style={[styles.statusPillText, { color: sm.text }]}>
                {(event.status || 'scheduled').charAt(0).toUpperCase() + (event.status || 'scheduled').slice(1)}
              </Text>
            </View>
            {event.intake_form?.event_type && (
              <Text style={styles.headerType}>{formatEventType(event.intake_form.event_type)}</Text>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Booking Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.stepsRow}>
              {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const isCurrent = i === currentStep;
                return (
                  <Fragment key={step.label}>
                    <View style={styles.stepItem}>
                      <View style={[
                        styles.stepDot,
                        step.done ? styles.stepDone : isCurrent ? styles.stepCurrent : styles.stepPending,
                      ]}>
                        {step.done
                          ? <Ionicons name="checkmark" size={12} color="#FFF" />
                          : <Text style={styles.stepNum}>{i + 1}</Text>
                        }
                      </View>
                      <Text style={[
                        styles.stepLabel,
                        step.done ? styles.stepLabelDone : isCurrent ? styles.stepLabelCurrent : styles.stepLabelPending,
                      ]}>
                        {step.label}
                      </Text>
                    </View>
                    {!isLast && (
                      <View style={[styles.stepLine, step.done ? styles.stepLineDone : styles.stepLinePending]} />
                    )}
                  </Fragment>
                );
              })}
            </View>
            {nextAction && (
              <TouchableOpacity
                style={styles.nextActionBtn}
                onPress={() => router.push(nextAction.route as any)}
              >
                <Text style={styles.nextActionText}>{nextAction.label}</Text>
              </TouchableOpacity>
            )}
            {isComplete && (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.completeText}>Event Completed!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Event Details</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="calendar-outline" label="Date"
              value={dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
            {(event.start_time || event.end_time) && (
              <InfoRow icon="time-outline" label="Time"
                value={[formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(' – ')} />
            )}
            {event.venue && (
              <InfoRow icon="business-outline" label="Venue" value={event.venue} />
            )}
            {event.location && (
              <InfoRow icon="location-outline" label="Address" value={event.location} />
            )}
            {event.intake_form?.guest_count && (
              <InfoRow icon="people-outline" label="Guest Count" value={String(event.intake_form.guest_count)} />
            )}
          </View>
        </View>

        {/* Client Info */}
        {event.intake_form && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Client Info</Text>
            <View style={styles.infoCard}>
              {event.intake_form.contact_name && (
                <InfoRow icon="person-outline" label="Name" value={event.intake_form.contact_name} />
              )}
              {event.intake_form.contact_email && (
                <InfoRow icon="mail-outline" label="Email" value={event.intake_form.contact_email} />
              )}
              {event.intake_form.contact_phone && (
                <InfoRow icon="call-outline" label="Phone" value={event.intake_form.contact_phone} />
              )}
              {event.intake_form.guest_count && (
                <InfoRow icon="people-outline" label="Expected Guests" value={String(event.intake_form.guest_count)} />
              )}

            </View>
          </View>
        )}

        {/* Estimates */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Estimates</Text>
            <TouchableOpacity onPress={() => router.push(`/(tabs)/estimates/new?eventId=${id}` as any)}>
              <Text style={styles.sectionLink}>+ New</Text>
            </TouchableOpacity>
          </View>
          {estimates.length === 0 ? (
            <TouchableOpacity
              style={styles.createEstimateCard}
              onPress={() => router.push(`/(tabs)/estimates/new?eventId=${id}` as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-text-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.createEstimateText}>Create Estimate</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionsCard}>
              {estimates.map((est, idx) => {
                const sm = EST_STATUS_META[est.status] || EST_STATUS_META.draft;
                return (
                  <Fragment key={est.id}>
                    {idx > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={styles.actionRow}
                      onPress={() => router.push(`/(tabs)/estimates/${est.id}` as any)}
                    >
                      <View style={styles.actionLeft}>
                        <View style={[styles.actionIcon, { backgroundColor: sm.bg }]}>
                          <Ionicons name="document-text-outline" size={20} color={sm.text} />
                        </View>
                        <View>
                          <Text style={styles.actionLabel}>{est.estimate_number}</Text>
                          <Text style={styles.estimateSubtitle}>
                            {formatCurrency(est.total_amount)} · {est.status.charAt(0).toUpperCase() + est.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </Fragment>
                );
              })}
            </View>
          )}
        </View>

        {/* Financial Summary */}
        {(event.booking || invoices.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Financials</Text>
            <View style={styles.infoCard}>
              {event.booking?.total_amount != null && (
                <InfoRow icon="receipt-outline" label="Contract Amount" value={formatCurrency(event.booking.total_amount)} />
              )}
              {event.booking?.deposit_amount != null && (
                <InfoRow icon="card-outline" label="Deposit Amount" value={formatCurrency(event.booking.deposit_amount)} />
              )}
              {invoices.map((inv, idx) => (
                <InfoRow
                  key={inv.id}
                  icon="document-text-outline"
                  label={`Invoice ${invoices.length > 1 ? idx + 1 : ''}`}
                  value={`${formatCurrency(inv.total_amount)} — ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`}
                />
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Actions</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push(`/(tabs)/estimates/new?eventId=${id}` as any)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="document-text-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.actionLabel}>New Estimate</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push(`/(tabs)/invoices/new?eventId=${id}` as any)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.infoLight }]}>
                  <Ionicons name="receipt-outline" size={20} color={Colors.info} />
                </View>
                <Text style={styles.actionLabel}>New Invoice</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(tabs)/clients' as any)}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.purpleLight }]}>
                  <Ionicons name="people-outline" size={20} color={Colors.purple} />
                </View>
                <Text style={styles.actionLabel}>View Client Intake</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDelete}
              disabled={deleting}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.errorLight }]}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </View>
                <Text style={[styles.actionLabel, { color: Colors.error }]}>
                  {deleting ? 'Deleting…' : 'Delete Event'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: 16, color: Colors.textSecondary },

  headerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20,
    marginBottom: 16, ...Shadow.md,
  },
  headerClient: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  headerType: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLink: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  createEstimateCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadow.sm,
  },
  createEstimateText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.primary },
  estimateSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  // Progress bar
  progressCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 18, ...Shadow.sm,
  },
  stepsRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepItem: { alignItems: 'center', width: 56 },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  stepDone: { backgroundColor: Colors.success },
  stepCurrent: { backgroundColor: Colors.primary },
  stepPending: { backgroundColor: Colors.border },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  stepLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },
  stepLabelDone: { color: Colors.success },
  stepLabelCurrent: { color: Colors.primary },
  stepLabelPending: { color: Colors.textMuted },
  stepLine: { flex: 1, height: 3, borderRadius: 2, marginTop: 13, marginHorizontal: 2 },
  stepLineDone: { backgroundColor: Colors.success },
  stepLinePending: { backgroundColor: Colors.border },
  nextActionBtn: {
    marginTop: 16, backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 11, alignItems: 'center',
  },
  nextActionText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  completeBadge: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  completeText: { fontSize: 14, fontWeight: '600', color: Colors.success },

  // Info card
  infoCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, maxWidth: '55%', textAlign: 'right' },

  // Actions card
  actionsCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 16 },
});
