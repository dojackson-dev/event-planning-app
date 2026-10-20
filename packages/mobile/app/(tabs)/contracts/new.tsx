import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface EventOption {
  id: string;
  name: string;
  date: string;
  venue?: string | null;
  location?: string | null;
  intake_form_id?: string | null;
  intake_form?: {
    contact_name?: string;
    contact_email?: string;
    event_name?: string;
    event_type?: string;
    guest_count?: number;
    event_time?: string;
  } | null;
}

// Matches the backend's /owner/payment-schedule response shape (camelCase,
// no separate "require deposit" flag — a null percentage means not required).
interface PaymentSchedule {
  depositPercentage: number | null;
}

// Mirrors the existing "venue_booking" contract_type body generated on the
// backend (ContractsService.generateBody) and on the web app
// (generateVenueContract in dashboard/contracts/new/page.tsx) — this is the
// platform's standard Venue Listing & Booking Agreement, with owner/client
// signature support already built into the contract detail screens.
function generateVenueContractHtml(td: {
  venueOwnerName: string; venueName: string; venueClientName: string;
  venueEventType: string; venueEventDate: string; venueEventTime: string;
  venueAccessWindow: string; venueGuestCount: string;
  venueTotalAmount: string; venueDeposit: string;
  venueCancelMoreThan: string; venueCancelMoreThanPolicy: string;
  venueCancelWithin: string; venueCancelWithinPolicy: string;
  venueGoverningState: string;
}): string {
  const agreementDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalAmount = td.venueTotalAmount || '';
  const deposit = td.venueDeposit || '';
  const remaining = totalAmount && deposit
    ? (parseFloat(totalAmount) - parseFloat(deposit)).toFixed(2)
    : '__________';
  return `<div style="font-family:Georgia,serif;max-width:780px;margin:0 auto;color:#111;line-height:1.75;padding:16px;">
  <h1 style="text-align:center;font-size:1.35rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px;">Venue Listing &amp; Booking Agreement</h1>
  <p style="text-align:center;font-style:italic;color:#555;margin-top:-16px;margin-bottom:28px;">EventEcos Platform</p>
  <p>This Agreement is entered into as of <strong>${agreementDate}</strong>, by and between:</p>
  <p style="margin-left:16px;"><strong>Venue Owner / Operator:</strong> ${td.venueOwnerName || ''}<br/><strong>Venue Name:</strong> ${td.venueName || ''}</p>
  <p style="margin-left:16px;">and</p>
  <p style="margin-left:16px;"><strong>Client / Event Host:</strong> ${td.venueClientName || ''}</p>
  <hr style="border:none;border-top:1px solid #ccc;margin:28px 0;"/>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:0;">1. Platform Overview</h2>
  <p>This booking is facilitated through EventEcos ("Platform"), which provides listing, booking, and payment processing services.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">2. Event Booking Details</h2>
  <ul style="margin:0;padding-left:20px;">
    <li><strong>Event Type:</strong> ${td.venueEventType || '____________________________'}</li>
    <li><strong>Event Date:</strong> ${td.venueEventDate || '____________________________'}</li>
    <li><strong>Event Time:</strong> ${td.venueEventTime || '____________________________'}</li>
    <li><strong>Access Window:</strong> ${td.venueAccessWindow || '____________________________'}</li>
    <li><strong>Guest Count:</strong> ${td.venueGuestCount || '____________________________'}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">3. Fees &amp; Payment</h2>
  <ul style="margin:0;padding-left:20px;">
    <li><strong>Total Booking Amount:</strong> $${totalAmount || '__________'}</li>
    <li><strong>Deposit:</strong> $${deposit || '__________'}</li>
    <li><strong>Remaining Balance Due:</strong> $${remaining}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">4. Cancellation &amp; Refund Policy</h2>
  <ul style="margin:0;padding-left:20px;">
    <li>More than <strong>${td.venueCancelMoreThan || '____'} days</strong> prior: ${td.venueCancelMoreThanPolicy || ''}</li>
    <li>Within <strong>${td.venueCancelWithin || '____'} days</strong>: ${td.venueCancelWithinPolicy || ''}</li>
  </ul>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">5. Venue Responsibilities</h2>
  <p>Venue Owner agrees to provide the venue as described in the listing, maintain safe and clean premises, and honor all confirmed bookings.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">6. Client Responsibilities</h2>
  <p>Client agrees to use the venue only as described and comply with all laws. Client is responsible for any damages during the event.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">7. Governing Law</h2>
  <p>This Agreement shall be governed by the laws of <strong>${td.venueGoverningState || 'Mississippi'}</strong>.</p>
  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:32px;">Signatures</h2>
  <div style="margin-top:20px;display:flex;gap:48px;flex-wrap:wrap;">
    <div style="flex:1;min-width:220px;"><p style="margin:0 0 4px;font-weight:bold;">Client / Event Host</p><p style="margin:0;font-size:.9rem;color:#444;">${td.venueClientName || ''}</p><div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div><p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p></div>
    <div style="flex:1;min-width:220px;"><p style="margin:0 0 4px;font-weight:bold;">Venue Owner / Operator</p><p style="margin:0;font-size:.9rem;color:#444;">${td.venueOwnerName || ''} — ${td.venueName || ''}</p><div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div><p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p></div>
  </div>
</div>`;
}

export default function NewContractScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [showEventPicker, setShowEventPicker] = useState(false);

  const [title, setTitle] = useState('Venue Listing & Booking Agreement');
  const [venueClientName, setVenueClientName] = useState('');
  const [venueClientEmail, setVenueClientEmail] = useState('');
  const [venueOwnerName, setVenueOwnerName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueEventType, setVenueEventType] = useState('');
  const [venueEventTime, setVenueEventTime] = useState('');
  const [venueAccessWindow, setVenueAccessWindow] = useState('');
  const [venueGuestCount, setVenueGuestCount] = useState('');
  const [venueTotalAmount, setVenueTotalAmount] = useState('');
  const [venueDeposit, setVenueDeposit] = useState('');
  const [venueCancelMoreThan, setVenueCancelMoreThan] = useState('14');
  const [venueCancelMoreThanPolicy, setVenueCancelMoreThanPolicy] = useState('Full deposit refunded.');
  const [venueCancelWithin, setVenueCancelWithin] = useState('7');
  const [venueCancelWithinPolicy, setVenueCancelWithinPolicy] = useState('Deposit is non-refundable.');
  const [venueGoverningState, setVenueGoverningState] = useState('Mississippi');
  const [saving, setSaving] = useState(false);
  const paymentScheduleRef = useRef<PaymentSchedule | null>(null);
  const primaryVenueNameRef = useRef<string>('');

  useEffect(() => { loadEvents(); loadOwnerDefaults(); }, []);

  useEffect(() => {
    if (eventId && events.length > 0 && !selectedEventId) {
      const ev = events.find(e => e.id === eventId);
      if (ev) selectEvent(ev);
    }
  }, [eventId, events]);

  const loadEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('event')
      .select('id, name, date, venue, location, intake_form_id, intake_form:intake_forms!intake_form_id(contact_name, contact_email, event_name, event_type, guest_count, event_time)')
      .eq('owner_id', user.id)
      .order('date', { ascending: false });
    setEvents((data as unknown as EventOption[]) || []);
  };

  // Pre-fill the "Venue Owner" field from the owner's users-table record
  // (the source of truth populated at signup — see Settings > Profile), and
  // load the default deposit percentage (falls back to this when an invoice
  // doesn't set its own deposit_percentage).
  const loadOwnerDefaults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();
        const fullName = `${data?.first_name || ''} ${data?.last_name || ''}`.trim();
        if (fullName) setVenueOwnerName(prev => prev || fullName);
      }
    } catch { /* ignore, leave field blank for manual entry */ }
    try {
      const schedule = await apiRequest<PaymentSchedule>('/owner/payment-schedule');
      if (schedule) paymentScheduleRef.current = schedule;
    } catch { /* ignore, use manual deposit entry */ }
    try {
      // Most events don't carry their own venue text — fall back to the
      // owner's single configured venue (Settings/Venue setup), mirroring
      // the web app's primary-venue fallback.
      const venueRes = await apiRequest<{ venue: { name?: string } | null }>('/owner/venue');
      if (venueRes?.venue?.name) {
        primaryVenueNameRef.current = venueRes.venue.name;
        setVenueName(prev => prev || venueRes.venue!.name!);
      }
    } catch { /* ignore, leave field blank for manual entry */ }
  };

  // Pulls the most relevant invoice for this event to pre-fill Total Amount
  // and computes the Deposit from the invoice's deposit_percentage (or the
  // owner's default payment-schedule percentage as a fallback). Matches on
  // event_id first, falling back to intake_form_id (mirrors the matching
  // logic used on the event detail screen).
  const fetchInvoiceForEvent = async (ev: EventOption) => {
    try {
      const filter = ev.intake_form_id
        ? `event_id.eq.${ev.id},intake_form_id.eq.${ev.intake_form_id}`
        : `event_id.eq.${ev.id}`;
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, deposit_percentage, status, created_at')
        .or(filter)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      const invoice = (data || [])[0] as { total_amount?: number; deposit_percentage?: number } | undefined;
      if (invoice?.total_amount != null) {
        setVenueTotalAmount(Number(invoice.total_amount).toFixed(2));
        let schedule = paymentScheduleRef.current;
        if (invoice.deposit_percentage == null && !schedule) {
          // Payment schedule hadn't finished loading yet (mount-time fetch
          // may still be in flight) — fetch it fresh so the deposit always
          // reflects the owner's configured percentage, not a stale/missing value.
          try {
            schedule = await apiRequest<PaymentSchedule>('/owner/payment-schedule');
            if (schedule) paymentScheduleRef.current = schedule;
          } catch { /* ignore, leave Deposit for manual entry */ }
        }
        const depositPct = invoice.deposit_percentage ?? schedule?.depositPercentage ?? undefined;
        if (depositPct != null) {
          setVenueDeposit(((Number(invoice.total_amount) * depositPct) / 100).toFixed(2));
        }
      }
    } catch { /* ignore, leave Total Amount / Deposit for manual entry */ }
  };

  const selectEvent = (ev: EventOption) => {
    setSelectedEventId(ev.id);
    setEventLabel(`${ev.intake_form?.event_name || ev.name} — ${new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
    setVenueClientName(ev.intake_form?.contact_name || '');
    setVenueClientEmail(ev.intake_form?.contact_email || '');
    setVenueName(ev.venue || ev.location || primaryVenueNameRef.current || '');
    setVenueEventType(ev.intake_form?.event_type || '');
    setVenueEventTime(ev.intake_form?.event_time || '');
    setVenueGuestCount(ev.intake_form?.guest_count ? String(ev.intake_form.guest_count) : '');
    setShowEventPicker(false);
    fetchInvoiceForEvent(ev);
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleCreate = async () => {
    if (!selectedEventId) {
      Alert.alert('Validation', 'Please select an event for this contract.');
      return;
    }
    if (!venueClientName.trim() || !venueOwnerName.trim() || !venueName.trim() || !venueTotalAmount.trim()) {
      Alert.alert('Validation', 'Please fill in Client Name, Venue Owner, Venue Name, and Total Amount.');
      return;
    }
    setSaving(true);
    try {
      const venueEventDate = selectedEvent
        ? new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';
      const templateData = {
        venueOwnerName, venueName, venueClientName, venueClientEmail,
        venueEventType, venueEventDate, venueEventTime, venueAccessWindow, venueGuestCount,
        venueTotalAmount, venueDeposit,
        venueCancelMoreThan, venueCancelMoreThanPolicy, venueCancelWithin, venueCancelWithinPolicy,
        venueGoverningState,
      };
      const body = generateVenueContractHtml(templateData);
      const contractData = {
        event_id: selectedEventId,
        intake_form_id: selectedEvent?.intake_form_id || undefined,
        title: title || 'Venue Listing & Booking Agreement',
        description: `Venue Booking Agreement — ${venueClientName}`,
        client_name: venueClientName,
        client_email: venueClientEmail || undefined,
        contract_type: 'venue_booking',
        body,
        status: 'draft',
        template_data: templateData,
      };
      const response = await apiRequest<{ id: string }>('/contracts', { method: 'POST', body: contractData });
      Alert.alert('Contract Created', 'Venue booking agreement saved as a draft.', [
        { text: 'View', onPress: () => router.replace(`/(tabs)/contracts/${response.id}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Event</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setShowEventPicker(v => !v)}>
          <Text style={[styles.selectText, !selectedEventId && styles.placeholder]}>
            {selectedEventId ? eventLabel : 'Select event'}
          </Text>
          <Ionicons name={showEventPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {showEventPicker && (
          <View style={styles.dropdown}>
            {events.length === 0 && (
              <View style={styles.dropdownItem}><Text style={styles.dropdownSub}>No events found</Text></View>
            )}
            {events.map(ev => (
              <TouchableOpacity key={ev.id} style={styles.dropdownItem} onPress={() => selectEvent(ev)}>
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {ev.intake_form?.event_name || ev.name} — {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                {!!ev.intake_form?.contact_name && <Text style={styles.dropdownSub}>{ev.intake_form.contact_name}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Contract title" placeholderTextColor={Colors.textMuted} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Parties</Text>
        <TextInput style={styles.input} value={venueClientName} onChangeText={setVenueClientName} placeholder="Client / event host name" placeholderTextColor={Colors.textMuted} />
        <TextInput style={[styles.input, { marginTop: 8 }]} value={venueClientEmail} onChangeText={setVenueClientEmail} placeholder="Client email" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[styles.input, { marginTop: 8 }]} value={venueOwnerName} onChangeText={setVenueOwnerName} placeholder="Venue owner / operator name" placeholderTextColor={Colors.textMuted} />
        <TextInput style={[styles.input, { marginTop: 8 }]} value={venueName} onChangeText={setVenueName} placeholder="Venue name" placeholderTextColor={Colors.textMuted} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Event Booking Details</Text>
        <TextInput style={styles.input} value={venueEventType} onChangeText={setVenueEventType} placeholder="Event type" placeholderTextColor={Colors.textMuted} />
        <TextInput style={[styles.input, { marginTop: 8 }]} value={venueEventTime} onChangeText={setVenueEventTime} placeholder="Event time" placeholderTextColor={Colors.textMuted} />
        <TextInput style={[styles.input, { marginTop: 8 }]} value={venueAccessWindow} onChangeText={setVenueAccessWindow} placeholder="Access window (e.g. 4pm–11pm)" placeholderTextColor={Colors.textMuted} />
        <TextInput style={[styles.input, { marginTop: 8 }]} value={venueGuestCount} onChangeText={setVenueGuestCount} placeholder="Guest count" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Fees</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput]} value={venueTotalAmount} onChangeText={setVenueTotalAmount} placeholder="Total amount ($)" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
          <TextInput style={[styles.input, styles.rowInput]} value={venueDeposit} onChangeText={setVenueDeposit} placeholder="Deposit ($)" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Cancellation &amp; Refund Policy</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.rowInput, { flex: 0.4 }]} value={venueCancelMoreThan} onChangeText={setVenueCancelMoreThan} placeholder="Days" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
          <TextInput style={[styles.input, styles.rowInput]} value={venueCancelMoreThanPolicy} onChangeText={setVenueCancelMoreThanPolicy} placeholder="Policy if cancelled more than X days prior" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <TextInput style={[styles.input, styles.rowInput, { flex: 0.4 }]} value={venueCancelWithin} onChangeText={setVenueCancelWithin} placeholder="Days" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
          <TextInput style={[styles.input, styles.rowInput]} value={venueCancelWithinPolicy} onChangeText={setVenueCancelWithinPolicy} placeholder="Policy if cancelled within X days" placeholderTextColor={Colors.textMuted} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Governing State</Text>
        <TextInput style={styles.input} value={venueGoverningState} onChangeText={setVenueGoverningState} placeholder="Governing state" placeholderTextColor={Colors.textMuted} />
      </View>

      <TouchableOpacity style={[styles.createBtn, saving && styles.createBtnDisabled]} onPress={handleCreate} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
          <><Ionicons name="document-text-outline" size={18} color="#FFF" /><Text style={styles.createBtnText}>Create Contract</Text></>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selectBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textMuted },
  dropdown: { backgroundColor: Colors.surface, borderRadius: Radius.md, marginTop: 4, borderWidth: 1, borderColor: Colors.border, maxHeight: 220, ...Shadow.md },
  dropdownItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  dropdownText: { fontSize: 14, color: Colors.textPrimary },
  dropdownSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  rowInput: { flex: 1 },
  createBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
