import { useState, useCallback, useMemo, ReactNode } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import EvtErrorState from '@/components/EvtErrorState';
import EvtProgressBar from '@/components/EvtProgressBar';
import EvtField from '@/components/EvtField';
import EvtPicker from '@/components/EvtPicker';
import DateTimeField from '@/components/DateTimeField';
import AppButton from '@/components/AppButton';
import EventNotesSection from '@/components/EventNotesSection';
import {
  EvtEvent, normalizeEvent, eventTitle, parseLocalDate, formatDate, formatTime, formatTimeRange, formatCurrency,
  titleCase, isValidDateInput, isValidTimeInput, EvtProgressStep,
} from '@/components/EvtDate';

type Mgmt = Record<string, any>;

const CLIENT_STATUS = [
  ['contacted_by_phone', 'Contacted by Phone'], ['walkthrough_completed', 'Walkthrough Completed'],
  ['booked', 'Booked'], ['deposit_paid', 'Deposit Paid'], ['completed', 'Completed'], ['cancelled', 'Cancelled'],
].map(([value, label]) => ({ value, label }));

const CONTRACT_STATUS = [
  ['draft', 'Draft'], ['sent', 'Sent to Client'], ['signed', 'Signed'], ['cancelled', 'Cancelled'], ['voided', 'Voided'],
].map(([value, label]) => ({ value, label }));

const INSURANCE_STATUS = [
  ['not_required', 'Not Required'], ['requested', 'Requested'], ['received', 'Received'],
  ['verified', 'Verified'], ['expired', 'Expired'],
].map(([value, label]) => ({ value, label }));

const INDOOR_OUTDOOR = [['indoor', 'Indoor'], ['outdoor', 'Outdoor'], ['both', 'Both']].map(([value, label]) => ({ value, label }));

const labelFor = (opts: { value: string; label: string }[], v?: string) => opts.find((o) => o.value === v)?.label || titleCase(v) || '—';

const pillColors = (status?: string | null) => {
  switch (status) {
    case 'signed': case 'paid': case 'approved': case 'converted': case 'confirmed': case 'completed':
      return { bg: Colors.successLight, text: Colors.successText };
    case 'sent': case 'viewed': case 'scheduled': case 'partial':
      return { bg: Colors.infoLight, text: Colors.infoText };
    case 'overdue': case 'cancelled': case 'rejected':
      return { bg: Colors.errorLight, text: Colors.errorText };
    case 'voided': case 'expired': case 'pending':
      return { bg: Colors.warningLight, text: Colors.warningText };
    default:
      return { bg: Colors.borderLight, text: Colors.textSecondary };
  }
};

function Pill({ status, label }: { status?: string | null; label?: string }) {
  const c = pillColors(status);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]}>{label ?? titleCase(status) ?? '—'}</Text>
    </View>
  );
}

function Section({ title, icon, right, children }: { title: string; icon?: keyof typeof Ionicons.glyphMap; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          {icon ? <Ionicons name={icon} size={15} color={Colors.primary} /> : null}
          <Text style={styles.sectionLabel}>{title}</Text>
        </View>
        {right}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function ToggleRow({ label, value, editing, onChange }: { label: string; value: boolean; editing: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editing ? (
        <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.primary }} />
      ) : (
        <Ionicons name={value ? 'checkmark-circle' : 'close-circle'} size={20} color={value ? Colors.success : Colors.textMuted} />
      )}
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EvtEvent | null>(null);
  const [mgmt, setMgmt] = useState<Mgmt>({});
  const [estimates, setEstimates] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [vendorBookings, setVendorBookings] = useState<any[]>([]);
  const [guestListId, setGuestListId] = useState<number | null>(null);
  const [venues, setVenues] = useState<{ id: string; name: string; address?: string; city?: string; state?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [creatingList, setCreatingList] = useState(false);

  // Editable form state (core event fields live on the event; the rest in management_data)
  const [form, setForm] = useState<Mgmt>({});
  const set = (k: string, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (fieldErrors[k]) setFieldErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const buildForm = (ev: EvtEvent, m: Mgmt): Mgmt => ({
    eventName: ev.intakeEventName || ev.name || '',
    eventDate: ev.date || '',
    startTime: ev.startTime || '',
    endTime: ev.endTime || '',
    venueId: ev.venueId || m.venueId || '',
    estimatedGuests: String(m.estimatedGuests || ev.maxGuests || ''),
    budgetRange: m.budgetRange || ev.budgetRange || '',
    setupTime: m.setupTime || '',
    breakdownTime: m.breakdownTime || '',
    indoorOutdoor: m.indoorOutdoor || '',
    venueSetup: m.venueSetup || '',
    clientEmail: m.clientEmail || ev.clientEmail || '',
    clientPhone: m.clientPhone || ev.clientPhone || '',
    clientStatus: m.clientStatus || 'contacted_by_phone',
    contractStatus: m.contractStatus || 'draft',
    contractSignedDate: m.contractSignedDate || '',
    contractAmount: m.contractAmount || '',
    depositAmount: m.depositAmount || '',
    depositPaid: !!m.depositPaid,
    depositPaidDate: m.depositPaidDate || '',
    balanceDue: m.balanceDue || '',
    balanceDueDate: m.balanceDueDate || '',
    insuranceStatus: m.insuranceStatus || 'not_required',
    insuranceProvider: m.insuranceProvider || '',
    insurancePolicyNumber: m.insurancePolicyNumber || '',
    insuranceExpiryDate: m.insuranceExpiryDate || '',
    certificateReceived: !!m.certificateReceived,
    securityRequired: !!m.securityRequired,
    securityCompany: m.securityCompany || '',
    securityContactName: m.securityContactName || '',
    securityContactPhone: m.securityContactPhone || '',
    numberOfSecurityStaff: String(m.numberOfSecurityStaff || ''),
    specialRequests: m.specialRequests || '',
    allergies: m.allergies || '',
    accessibility: m.accessibility || '',
    internalNotes: m.internalNotes || '',
  });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      const [evRaw, m, est, inv, con, gl, vb, ven] = await Promise.all([
        apiRequest<any>(`/events/${id}`),
        apiRequest<Mgmt>(`/events/${id}/management`).catch(() => ({})),
        apiRequest<any[]>(`/estimates?eventId=${id}`).catch(() => []),
        apiRequest<any[]>('/invoices').catch(() => []),
        apiRequest<any[]>('/contracts').catch(() => []),
        apiRequest<any[]>('/guest-lists').catch(() => []),
        apiRequest<any[]>('/vendors/bookings/owner').catch(() => []),
        apiRequest<{ venues: any[] }>('/owner/venues').catch(() => ({ venues: [] })),
      ]);
      if (!evRaw || !evRaw.id) throw new Error('Event not found');
      const ev = normalizeEvent(evRaw);
      const management = m || {};
      setEvent(ev);
      setMgmt(management);
      setVenues(ven?.venues || []);
      setEstimates(Array.isArray(est) ? est : []);

      const allInv = Array.isArray(inv) ? inv : [];
      let matchedInv = allInv.filter((i) => i.event_id && i.event_id === ev.id);
      if (!matchedInv.length && ev.intakeFormId) matchedInv = allInv.filter((i) => i.intake_form_id === ev.intakeFormId);
      if (!matchedInv.length && ev.bookingId) matchedInv = allInv.filter((i) => i.booking_id === ev.bookingId);
      if (!matchedInv.length && ev.clientName) {
        matchedInv = allInv.filter((i) => i.client_name && ev.clientName!.toLowerCase().includes(String(i.client_name).toLowerCase()));
      }
      setInvoices(matchedInv);

      const allCon = Array.isArray(con) ? con : [];
      setContracts(allCon.filter((c) => c.event_id === ev.id || (ev.intakeFormId && c.intake_form_id === ev.intakeFormId)));

      const match = (Array.isArray(gl) ? gl : []).find((g) => String(g.event_id ?? g.eventId) === String(ev.id));
      setGuestListId(match ? match.id : null);

      const dateKey = (ev.date || '').slice(0, 10);
      setVendorBookings(
        (Array.isArray(vb) ? vb : []).filter(
          (b) => b.event_id === ev.id || (!b.event_id && String(b.event_date || '').slice(0, 10) === dateKey),
        ),
      );
      setForm(buildForm(ev, management));
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const steps: EvtProgressStep[] = useMemo(() => {
    if (!event) return [];
    const intakeActivated = !event.intakeFormId || ['converted', 'confirmed', 'accepted'].includes(event.intakeFormStatus || '');
    const estimateAccepted = estimates.some((e) => ['approved', 'converted'].includes(e.status));
    const hasActive = contracts.some((c) => c.status !== 'voided');
    const signed = mgmt.contractStatus === 'signed' || contracts.some((c) => c.status === 'signed');
    const invoicePaid = invoices.some((i) => i.status === 'paid');
    return [
      { label: 'Activate', done: intakeActivated },
      { label: 'Estimate', done: estimateAccepted },
      { label: 'Contract', done: signed, skipped: !hasActive && !signed },
      { label: 'Invoice', done: invoicePaid },
      { label: 'Booked', done: invoicePaid },
    ];
  }, [event, estimates, contracts, invoices, mgmt]);

  const startEdit = () => {
    if (event) setForm(buildForm(event, mgmt));
    setSaveError('');
    setFieldErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    if (event) setForm(buildForm(event, mgmt));
    setEditing(false);
    setSaveError('');
    setFieldErrors({});
  };

  const save = async () => {
    if (!event) return;
    const errs: Record<string, string> = {};
    if (!String(form.eventName).trim()) errs.eventName = 'Event name is required';
    if (!isValidDateInput(String(form.eventDate))) errs.eventDate = 'Select a valid date';
    if (form.startTime && !isValidTimeInput(String(form.startTime))) errs.startTime = 'Select a valid time';
    if (form.endTime && !isValidTimeInput(String(form.endTime))) errs.endTime = 'Select a valid time';
    if (form.setupTime && !isValidTimeInput(String(form.setupTime))) errs.setupTime = 'Select a valid time';
    if (form.breakdownTime && !isValidTimeInput(String(form.breakdownTime))) errs.breakdownTime = 'Select a valid time';
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setSaveError('Please fix the highlighted fields.');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      const guests = parseInt(String(form.estimatedGuests), 10);
      await apiRequest(`/events/${event.id}`, {
        method: 'PATCH',
        body: {
          name: String(form.eventName).trim(),
          date: form.eventDate,
          startTime: form.startTime || undefined,
          endTime: form.endTime || null,
          venueId: form.venueId || null,
          maxGuests: Number.isNaN(guests) ? null : guests,
        },
      });
      const staff = parseInt(String(form.numberOfSecurityStaff), 10);
      const {
        eventName: _n, eventDate: _d, startTime: _s, endTime: _e, ...rest
      } = form;
      await apiRequest(`/events/${event.id}/management`, {
        method: 'PUT',
        body: {
          ...rest,
          estimatedGuests: Number.isNaN(guests) ? 0 : guests,
          numberOfSecurityStaff: Number.isNaN(staff) ? 0 : staff,
        },
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setSaveError(err.message || 'Error saving data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!event) return;
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await apiRequest(`/events/${event.id}`, { method: 'DELETE' });
            router.replace('/(tabs)/events' as any);
          } catch (err: any) {
            Alert.alert('Error deleting event', err.message || 'Please try again.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const voidContract = (contractId: string) => {
    Alert.alert('Void Contract', 'The client will no longer need to sign it and the booking can proceed to the invoice step.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void', style: 'destructive',
        onPress: async () => {
          setVoidingId(contractId);
          try {
            await apiRequest(`/contracts/${contractId}/void`, { method: 'POST' });
            await load();
          } catch (err: any) {
            Alert.alert('Failed to void contract', err.message || 'Please try again.');
          } finally {
            setVoidingId(null);
          }
        },
      },
    ]);
  };

  const createDoorList = async () => {
    if (!event) return;
    setCreatingList(true);
    try {
      const created = await apiRequest<{ id: number }>('/guest-lists', {
        method: 'POST',
        body: { eventId: event.id, clientId: event.intakeFormId || undefined, maxGuestsPerPerson: 2 },
      });
      router.push(`/(tabs)/door-lists/${created.id}` as any);
    } catch (err: any) {
      Alert.alert('Failed to create door list', err.message || 'Please try again.');
    } finally {
      setCreatingList(false);
    }
  };

  const removeInvitationImage = (index: number) => {
    if (!event) return;
    const images: string[] = (mgmt.invitationImages || []).filter((_: string, i: number) => i !== index);
    Alert.alert('Remove image', 'Remove this invitation image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/events/${event.id}/invitation-images`, { method: 'PUT', body: { images } });
            setMgmt((p) => ({ ...p, invitationImages: images }));
          } catch (err: any) {
            Alert.alert('Failed to remove image', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) return <><Stack.Screen options={{ title: 'Event' }} /><LoadingState message="Loading event…" /></>;
  if (error || !event) {
    return (
      <>
        <Stack.Screen options={{ title: 'Event' }} />
        <EvtErrorState title="Couldn't load event" message={error || 'Event not found'} onRetry={() => { setLoading(true); load(); }} />
      </>
    );
  }

  const title = eventTitle(event);
  const venue = venues.find((v) => v.id === (form.venueId || event.venueId));
  const venueAddress = venue ? [venue.address, venue.city, venue.state].filter(Boolean).join(', ') : '';

  const approvedEstimate = estimates.find((e) => ['approved', 'converted'].includes(e.status));
  const estimateAccepted = steps[1]?.done;
  const contractSigned = steps[2]?.done;
  const contractSkipped = !!steps[2]?.skipped;
  const invoiceSent = invoices.some((i) => ['sent', 'partial', 'paid', 'overdue'].includes(i.status));
  const invoicePaid = invoices.some((i) => i.status === 'paid');
  const clientParam = event.intakeFormId ? `&clientId=${event.intakeFormId}` : '';
  const invoiceRoute = `/(tabs)/invoices/new?eventId=${event.id}${clientParam}${approvedEstimate ? `&estimateId=${approvedEstimate.id}` : ''}`;
  const contractRoute = `/(tabs)/contracts/new${event.intakeFormId ? `?intakeFormId=${event.intakeFormId}` : ''}`;

  const nextAction = (() => {
    if (invoiceSent && !invoicePaid) return null;
    if (!estimateAccepted) return { label: 'Send Estimate →', route: `/(tabs)/estimates/new?eventId=${event.id}${clientParam}` };
    if (!contractSigned && !contractSkipped) return { label: 'Send Contract →', route: contractRoute };
    if (!invoiceSent) return { label: 'Send Invoice →', route: invoiceRoute };
    return null;
  })();

  const f = form;
  const textField = (key: string, label: string, props: Record<string, any> = {}) =>
    editing ? (
      <EvtField label={label} value={String(f[key] ?? '')} onChangeText={(v) => set(key, v)} error={fieldErrors[key]} autoCapitalize="none" {...props} />
    ) : null;

  const pickerField = (mode: 'date' | 'time', key: string, label: string, props: Record<string, any> = {}) =>
    editing ? (
      <DateTimeField mode={mode} label={label} value={String(f[key] ?? '')} onChange={(v) => set(key, v)} error={fieldErrors[key]} {...props} />
    ) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: event.clientName || title, headerBackTitle: 'Events' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.headerCard, Shadow.md]}>
          {event.clientName ? <Text style={styles.headerClient}>{event.clientName}</Text> : null}
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRow}>
            <Pill status={event.status} label={titleCase(event.status || 'scheduled')} />
            <Text style={styles.headerDate}>{formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </View>
          <View style={styles.headerActions}>
            {!editing ? (
              <>
                <AppButton title="Edit" onPress={startEdit} style={styles.headerBtn} />
                <AppButton title={deleting ? 'Deleting…' : 'Delete'} onPress={confirmDelete} variant="outline" disabled={deleting}
                  style={{ ...styles.headerBtn, borderColor: Colors.error }} textStyle={{ color: Colors.error }} />
              </>
            ) : (
              <>
                <AppButton title="Cancel" onPress={cancelEdit} variant="outline" style={styles.headerBtn} />
                <AppButton title="Save Changes" onPress={save} loading={saving} style={styles.headerBtn} />
              </>
            )}
          </View>
          {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        </View>

        {/* Booking progress */}
        <Section title="Booking Progress" icon="trending-up-outline">
          <View style={{ padding: 16 }}>
            <EvtProgressBar steps={steps} />
            {nextAction ? (
              <TouchableOpacity style={styles.nextBtn} onPress={() => router.push(nextAction.route as any)}>
                <Text style={styles.nextBtnText}>{nextAction.label}</Text>
              </TouchableOpacity>
            ) : null}
            {invoiceSent && !invoicePaid ? <Text style={styles.awaiting}>Awaiting payment</Text> : null}
            {invoicePaid ? (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.completeText}>Booked — invoice paid</Text>
              </View>
            ) : null}
          </View>
        </Section>

        {/* Event details */}
        <Section title="Event Details" icon="calendar-outline">
          <View style={styles.pad}>
            {editing ? (
              <>
                {textField('eventName', 'Event Name', { autoCapitalize: 'sentences' })}
                {pickerField('date', 'eventDate', 'Event Date', { required: true })}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>{pickerField('time', 'startTime', 'Start', { clearable: true })}</View>
                  <View style={{ flex: 1 }}>{pickerField('time', 'endTime', 'End', { clearable: true })}</View>
                </View>
                {textField('estimatedGuests', 'Estimated Guests', { keyboardType: 'number-pad' })}
                {textField('budgetRange', 'Budget Range', { placeholder: 'e.g. $10,000 - $20,000' })}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>{pickerField('time', 'setupTime', 'Setup', { clearable: true })}</View>
                  <View style={{ flex: 1 }}>{pickerField('time', 'breakdownTime', 'Breakdown', { clearable: true })}</View>
                </View>
                <EvtPicker
                  label="Venue" value={f.venueId} onChange={(v) => set('venueId', v)}
                  emptyLabel="— No venue assigned —" placeholder="— No venue assigned —"
                  options={venues.map((v) => ({ value: v.id, label: v.name, sub: [v.address, v.city, v.state].filter(Boolean).join(', ') || undefined }))}
                />
                <EvtPicker label="Indoor / Outdoor" value={f.indoorOutdoor} onChange={(v) => set('indoorOutdoor', v)} emptyLabel="Not set" placeholder="Not set" options={INDOOR_OUTDOOR} />
                {textField('venueSetup', 'Venue Setup Notes', { multiline: true, autoCapitalize: 'sentences' })}
              </>
            ) : (
              <>
                <Row label="Name" value={f.eventName} />
                {event.description ? <Row label="Description" value={event.description} /> : null}
                <Row label="Date" value={formatDate(event.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
                <Row label="Time" value={formatTimeRange(event.startTime, event.endTime)} />
                <Row label="Estimated Guests" value={f.estimatedGuests} />
                <Row label="Budget Range" value={f.budgetRange} />
                <Row label="Setup Time" value={formatTime(f.setupTime)} />
                <Row label="Breakdown Time" value={formatTime(f.breakdownTime)} />
                <Row label="Venue" value={venue ? venue.name : event.venue || ''} />
                {venueAddress ? <Row label="Address" value={venueAddress} /> : event.location ? <Row label="Address" value={event.location} /> : null}
                <Row label="Indoor / Outdoor" value={f.indoorOutdoor ? titleCase(f.indoorOutdoor) : ''} />
                <Row label="Setup Notes" value={f.venueSetup} last />
              </>
            )}
          </View>
        </Section>

        {/* Client */}
        <Section title="Client Information" icon="person-outline">
          <View style={styles.pad}>
            <Row label="Name" value={event.clientName} />
            {editing ? (
              <>
                {textField('clientEmail', 'Email', { keyboardType: 'email-address' })}
                {textField('clientPhone', 'Phone', { keyboardType: 'phone-pad' })}
                <EvtPicker label="Client Status" value={f.clientStatus} onChange={(v) => set('clientStatus', v || 'contacted_by_phone')} options={CLIENT_STATUS} />
              </>
            ) : (
              <>
                <Row label="Email" value={f.clientEmail} />
                <Row label="Phone" value={f.clientPhone} />
                <Row label="Status" value={labelFor(CLIENT_STATUS, f.clientStatus)} last />
              </>
            )}
          </View>
        </Section>

        {/* Contract & payment */}
        <Section title="Contract & Payment" icon="document-text-outline">
          <View style={styles.pad}>
            {editing ? (
              <>
                <EvtPicker label="Contract Status" value={f.contractStatus} onChange={(v) => set('contractStatus', v || 'draft')} options={CONTRACT_STATUS} />
                {pickerField('date', 'contractSignedDate', 'Signed Date', { clearable: true })}
                {textField('contractAmount', 'Contract Amount', { keyboardType: 'decimal-pad' })}
                {textField('depositAmount', 'Deposit Amount', { keyboardType: 'decimal-pad' })}
                <ToggleRow label="Deposit Paid" value={!!f.depositPaid} editing onChange={(v) => set('depositPaid', v)} />
                {pickerField('date', 'depositPaidDate', 'Deposit Paid Date', { clearable: true })}
                {textField('balanceDue', 'Balance Due', { keyboardType: 'decimal-pad' })}
                {pickerField('date', 'balanceDueDate', 'Balance Due Date', { clearable: true })}
              </>
            ) : (
              <>
                <Row label="Contract Status" value={labelFor(CONTRACT_STATUS, f.contractStatus)} />
                <Row label="Signed Date" value={f.contractSignedDate} />
                <Row label="Contract Amount" value={f.contractAmount ? formatCurrency(f.contractAmount) : ''} />
                <Row label="Deposit Amount" value={f.depositAmount ? formatCurrency(f.depositAmount) : ''} />
                <ToggleRow label="Deposit Paid" value={!!f.depositPaid} editing={false} onChange={() => {}} />
                <Row label="Deposit Paid Date" value={f.depositPaidDate} />
                <Row label="Balance Due" value={f.balanceDue ? formatCurrency(f.balanceDue) : ''} />
                <Row label="Balance Due Date" value={f.balanceDueDate} last />
              </>
            )}
          </View>
        </Section>

        {/* Contracts */}
        <Section
          title="Contracts" icon="reader-outline"
          right={<TouchableOpacity onPress={() => router.push(contractRoute as any)}><Text style={styles.link}>+ Draft</Text></TouchableOpacity>}
        >
          {contracts.length === 0 ? (
            <Text style={styles.emptyText}>No contracts yet.</Text>
          ) : contracts.map((c, i) => (
            <View key={c.id} style={[styles.listRow, i === contracts.length - 1 && { borderBottomWidth: 0 }]}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/(tabs)/contracts/${c.id}` as any)}>
                <Text style={styles.listTitle} numberOfLines={1}>{c.title ?? `Contract #${c.contract_number}`}</Text>
                {c.title && c.contract_number ? <Text style={styles.listSub}>#{c.contract_number}</Text> : null}
              </TouchableOpacity>
              <Pill status={c.status} />
              {(c.status === 'draft' || c.status === 'sent') ? (
                <TouchableOpacity onPress={() => voidContract(c.id)} disabled={voidingId === c.id} hitSlop={8}>
                  <Text style={[styles.link, { color: Colors.warning }]}>{voidingId === c.id ? '…' : 'Void'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </Section>

        {/* Insurance */}
        <Section title="Insurance" icon="shield-checkmark-outline">
          <View style={styles.pad}>
            {editing ? (
              <>
                <EvtPicker label="Insurance Status" value={f.insuranceStatus} onChange={(v) => set('insuranceStatus', v || 'not_required')} options={INSURANCE_STATUS} />
                {textField('insuranceProvider', 'Provider', { autoCapitalize: 'words' })}
                {textField('insurancePolicyNumber', 'Policy Number')}
                {pickerField('date', 'insuranceExpiryDate', 'Expiry Date', { clearable: true })}
                <ToggleRow label="Certificate Received" value={!!f.certificateReceived} editing onChange={(v) => set('certificateReceived', v)} />
              </>
            ) : (
              <>
                <Row label="Status" value={labelFor(INSURANCE_STATUS, f.insuranceStatus)} />
                <Row label="Provider" value={f.insuranceProvider} />
                <Row label="Policy Number" value={f.insurancePolicyNumber} />
                <Row label="Expiry Date" value={f.insuranceExpiryDate} />
                <ToggleRow label="Certificate Received" value={!!f.certificateReceived} editing={false} onChange={() => {}} />
              </>
            )}
          </View>
        </Section>

        {/* Vendor contacts saved on the event */}
        {Array.isArray(mgmt.vendors) && mgmt.vendors.length > 0 ? (
          <Section title="Vendor Contacts" icon="briefcase-outline">
            {mgmt.vendors.map((v: any, i: number) => (
              <View key={v.id ?? i} style={[styles.listRow, i === mgmt.vendors.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{v.companyName || 'Vendor'}</Text>
                  <Text style={styles.listSub} numberOfLines={1}>
                    {[titleCase(v.category), v.contactPerson, v.phone].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Pill status={v.contractStatus} />
              </View>
            ))}
          </Section>
        ) : null}

        {/* Special requirements */}
        <Section title="Special Requirements" icon="alert-circle-outline">
          <View style={styles.pad}>
            {editing ? (
              <>
                {textField('specialRequests', 'Special Requests', { multiline: true, autoCapitalize: 'sentences' })}
                {textField('allergies', 'Allergies / Dietary', { multiline: true, autoCapitalize: 'sentences' })}
                {textField('accessibility', 'Accessibility Needs', { multiline: true, autoCapitalize: 'sentences' })}
                {textField('internalNotes', 'Internal Notes', { multiline: true, autoCapitalize: 'sentences' })}
              </>
            ) : (
              <>
                <Row label="Special Requests" value={f.specialRequests} />
                <Row label="Allergies" value={f.allergies} />
                <Row label="Accessibility" value={f.accessibility} />
                <Row label="Internal Notes" value={f.internalNotes} last />
              </>
            )}
          </View>
        </Section>

        {/* Security */}
        <Section title="Security" icon="lock-closed-outline">
          <View style={styles.pad}>
            <ToggleRow label="Security Required" value={!!f.securityRequired} editing={editing} onChange={(v) => set('securityRequired', v)} />
            {f.securityRequired ? (
              editing ? (
                <>
                  {textField('securityCompany', 'Security Company', { autoCapitalize: 'words' })}
                  {textField('securityContactName', 'Contact Name', { autoCapitalize: 'words' })}
                  {textField('securityContactPhone', 'Contact Phone', { keyboardType: 'phone-pad' })}
                  {textField('numberOfSecurityStaff', 'Number of Staff', { keyboardType: 'number-pad' })}
                </>
              ) : (
                <>
                  <Row label="Company" value={f.securityCompany} />
                  <Row label="Contact" value={f.securityContactName} />
                  <Row label="Phone" value={f.securityContactPhone} />
                  <Row label="Staff" value={f.numberOfSecurityStaff} last />
                </>
              )
            ) : null}
          </View>
        </Section>

        {/* Door list */}
        <Section title="Door List" icon="list-outline">
          <View style={styles.pad}>
            {guestListId ? (
              <AppButton title="View Door List" onPress={() => router.push(`/(tabs)/door-lists/${guestListId}` as any)} />
            ) : (
              <>
                <Text style={styles.emptyInline}>No door list created for this event yet.</Text>
                <AppButton title="Create Door List" variant="outline" onPress={createDoorList} loading={creatingList} />
              </>
            )}
          </View>
        </Section>

        {/* Booked vendors */}
        <Section title="Vendors" icon="storefront-outline">
          {vendorBookings.length === 0 ? (
            <Text style={styles.emptyText}>No vendors booked yet.</Text>
          ) : vendorBookings.map((vb, i) => (
            <View key={vb.id} style={[styles.listRow, i === vendorBookings.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{vb.vendor_accounts?.business_name || 'Vendor'}</Text>
                <Text style={styles.listSub}>
                  {titleCase(vb.vendor_accounts?.category)}{Number(vb.agreed_amount) > 0 ? ` · ${formatCurrency(vb.agreed_amount)}` : ''}
                </Text>
              </View>
              <Pill status={vb.status} />
              {(vb.status === 'confirmed' || vb.status === 'completed') ? (
                <TouchableOpacity onPress={() => router.push(`/(tabs)/invoices/new?vendorBookingId=${vb.id}` as any)} hitSlop={8}>
                  <Text style={styles.link}>+ Invoice</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </Section>

        {/* RSVP */}
        <Section title="RSVP" icon="mail-open-outline">
          <View style={styles.pad}>
            {event.intakeFormId ? (
              <AppButton title="Manage RSVPs" variant="outline" onPress={() => router.push(`/(tabs)/rsvp/${event.intakeFormId}` as any)} />
            ) : null}
            {(mgmt.invitationImages || []).length === 0 ? (
              <Text style={[styles.emptyInline, { marginTop: event.intakeFormId ? 10 : 0 }]}>No invitation images. Upload them from the web app.</Text>
            ) : (
              (mgmt.invitationImages as string[]).map((url, i) => (
                <View key={url + i} style={styles.imageWrap}>
                  <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
                  <TouchableOpacity style={styles.imageRemove} onPress={() => removeInvitationImage(i)}>
                    <Ionicons name="close" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </Section>

        {/* Estimates */}
        <Section
          title="Estimates" icon="calculator-outline"
          right={<TouchableOpacity onPress={() => router.push(`/(tabs)/estimates/new?eventId=${event.id}${clientParam}` as any)}><Text style={styles.link}>+ New</Text></TouchableOpacity>}
        >
          {estimates.length === 0 ? (
            <Text style={styles.emptyText}>No estimates yet.</Text>
          ) : estimates.map((est, i) => (
            <TouchableOpacity
              key={est.id}
              style={[styles.listRow, i === estimates.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(`/(tabs)/estimates/${est.id}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{est.estimate_number}</Text>
                <Text style={styles.listSub}>{formatCurrency(est.total_amount)}</Text>
              </View>
              <Pill status={est.status} />
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Section>

        {/* Invoices */}
        <Section
          title="Invoices" icon="receipt-outline"
          right={<TouchableOpacity onPress={() => router.push(invoiceRoute as any)}><Text style={styles.link}>+ New</Text></TouchableOpacity>}
        >
          {invoices.length === 0 ? (
            <Text style={styles.emptyText}>No invoices yet.</Text>
          ) : invoices.map((inv, i) => (
            <TouchableOpacity
              key={inv.id}
              style={[styles.listRow, i === invoices.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(`/(tabs)/invoices/${inv.id}` as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{inv.invoice_number}</Text>
                <Text style={styles.listSub}>{formatCurrency(inv.total_amount)}</Text>
              </View>
              <Pill status={inv.status} />
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Section>

        {/* Notes */}
        <EventNotesSection eventId={event.id} />

        {editing ? (
          <View style={styles.bottomActions}>
            <AppButton title="Cancel" onPress={cancelEdit} variant="outline" style={styles.headerBtn} />
            <AppButton title="Save Changes" onPress={save} loading={saving} style={styles.headerBtn} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },

  headerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, marginBottom: 16 },
  headerClient: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerDate: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  headerBtn: { flex: 1, minHeight: 44, paddingVertical: 10 },
  saveError: { marginTop: 10, fontSize: 13, color: Colors.error },
  bottomActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },

  section: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  link: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  pad: { padding: 16 },
  twoCol: { flexDirection: 'row', gap: 10 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, marginBottom: 4,
  },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  listTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  listSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  emptyText: { fontSize: 13, color: Colors.textMuted, padding: 16 },
  emptyInline: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },

  nextBtn: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 11, alignItems: 'center' },
  nextBtnText: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
  awaiting: { marginTop: 14, textAlign: 'center', fontSize: 13, fontWeight: '600', color: Colors.warningText },
  completeBadge: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  completeText: { fontSize: 14, fontWeight: '600', color: Colors.success },

  imageWrap: { marginTop: 10, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  image: { width: '100%', height: 160 },
  imageRemove: {
    position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
});
