import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import LoadingState from '@/components/LoadingState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctField from '@/components/AcctField';

const WEB_URL = 'https://eventecos.com';

type Tab = 'profile' | 'business' | 'billing' | 'password' | 'account';

const TABS: { value: Tab; label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'business', label: 'Business' },
  { value: 'billing', label: 'Billing' },
  { value: 'password', label: 'Password' },
  { value: 'account', label: 'Account' },
];

export default function SettingsScreen() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <View style={styles.container}>
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.value} style={[styles.tab, tab === t.value && styles.tabActive]} onPress={() => setTab(t.value)}>
              <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'business' && <BusinessTab />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'password' && <PasswordTab />}
      {tab === 'account' && <AccountTab />}
    </View>
  );
}

function Banner({ message }: { message: { type: 'success' | 'error'; text: string } | null }) {
  if (!message) return null;
  return (
    <Text style={[styles.banner, message.type === 'success' ? styles.bannerOk : styles.bannerErr]}>{message.text}</Text>
  );
}

function ProfileTab() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, owner] = await Promise.all([
        apiRequest<any>('/auth/me'),
        apiRequest<{ phoneNumber?: string | null }>('/owner/profile').catch(() => null),
      ]);
      const meta = me?.user_metadata || {};
      setFirstName(meta.first_name || '');
      setLastName(meta.last_name || '');
      setEmail(me?.email || '');
      setOriginalEmail(me?.email || '');
      setPhone(owner?.phoneNumber || meta.phone || me?.phone || '');
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setMessage(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setMessage({ type: 'error', text: 'First name, last name and email are required.' });
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() },
      });
      const emailChanged = email.trim() !== originalEmail;
      setOriginalEmail(email.trim());
      setMessage({
        type: 'success',
        text: emailChanged ? 'Profile updated. Verify your new email address to finish the change.' : 'Profile updated successfully!',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) return <LoadingState message="Loading profile…" />;
  if (loadError) return <AcctErrorState message={loadError} onRetry={load} />;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} keyboardShouldPersistTaps="handled">
      <AcctField label="First name" required value={firstName} onChangeText={setFirstName} placeholder="First name" />
      <AcctField label="Last name" required value={lastName} onChangeText={setLastName} placeholder="Last name" />
      <AcctField
        label="Email address"
        required
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        hint="Changing your email will require you to verify the new address"
      />
      <AcctField label="Phone number" value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" />
      <AppButton title="Save changes" onPress={handleSave} loading={saving} />
      <Banner message={message} />

      <TouchableOpacity style={styles.signOutBtn} onPress={confirmSignOut}>
        <Ionicons name="log-out-outline" size={18} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BusinessTab() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ businessName?: string; logoUrl?: string | null; coverImageUrl?: string | null }>('/owner/profile');
      setBusinessName(data?.businessName || '');
      setSavedName(data?.businessName || '');
      setLogoUrl(data?.logoUrl || null);
      setCoverUrl(data?.coverImageUrl || null);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load business settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setMessage(null);
    const name = businessName.trim();
    if (!name) { setMessage({ type: 'error', text: 'Business name cannot be empty.' }); return; }
    if (name === savedName) return;
    setSaving(true);
    try {
      await apiRequest('/owner/profile', { method: 'PUT', body: { businessName: name } });
      setSavedName(name);
      setMessage({ type: 'success', text: 'Business name updated.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update business name. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading business settings…" />;
  if (loadError) return <AcctErrorState message={loadError} onRetry={load} />;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business branding</Text>
        <AcctField label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Your venue or company name" />
        <AppButton title="Save business name" onPress={handleSave} loading={saving} disabled={!businessName.trim() || businessName.trim() === savedName} />
        <Banner message={message} />

        {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" /> : null}
        {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" /> : null}
        <Text style={styles.hint}>Logo and banner photos can be uploaded from the web dashboard.</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${WEB_URL}/dashboard/settings?tab=branding`)}>
          <Text style={styles.linkText}>Manage logo & banner on web</Text>
          <Ionicons name="open-outline" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Venues</Text>
        <Text style={styles.hint}>Add, edit or remove the venues under your account.</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(tabs)/venues' as any)}>
          <Text style={styles.linkText}>Manage venues</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bank account & payouts</Text>
        <Text style={styles.hint}>Payouts are processed by Stripe Connect. Connect or update your bank account on the web dashboard.</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`${WEB_URL}/dashboard/settings?tab=payouts`)}>
          <Text style={styles.linkText}>Manage payouts on web</Text>
          <Ionicons name="open-outline" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Team & security</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(tabs)/team' as any)}>
          <Text style={styles.linkText}>Team members</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(tabs)/security' as any)}>
          <Text style={styles.linkText}>Security personnel</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function BillingTab() {
  const [enabled, setEnabled] = useState(false);
  const [depositPct, setDepositPct] = useState('50');
  const [depositDays, setDepositDays] = useState('45');
  const [finalDays, setFinalDays] = useState('14');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiRequest<{ depositPercentage: number | null; depositDueDaysBefore: number | null; finalPaymentDueDaysBefore: number | null }>('/owner/payment-schedule');
      if (d?.depositPercentage != null) {
        setEnabled(true);
        setDepositPct(String(Number(d.depositPercentage)));
        setDepositDays(String(Number(d.depositDueDaysBefore ?? 45)));
        setFinalDays(String(Number(d.finalPaymentDueDaysBefore ?? 14)));
      } else {
        setEnabled(false);
      }
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load your payment schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setMessage(null);
    const pct = Number(depositPct);
    const dDays = Number(depositDays);
    const fDays = Number(finalDays);
    if (enabled) {
      if (!Number.isFinite(pct) || pct < 1 || pct > 100) { setMessage({ type: 'error', text: 'Deposit must be between 1 and 100%.' }); return; }
      if (!Number.isInteger(dDays) || dDays < 0 || !Number.isInteger(fDays) || fDays < 0) {
        setMessage({ type: 'error', text: 'Due days must be whole numbers of 0 or more.' });
        return;
      }
    }
    setSaving(true);
    try {
      // Matches the web billing tab: all three values are cleared when deposits are not required.
      await apiRequest('/owner/payment-schedule', {
        method: 'PUT',
        body: {
          depositPercentage: enabled ? pct : null,
          depositDueDaysBefore: enabled ? dDays : null,
          finalPaymentDueDaysBefore: enabled ? fDays : null,
        },
      });
      setMessage({ type: 'success', text: 'Payment schedule saved!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save payment schedule.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading payment schedule…" />;
  if (loadError) return <AcctErrorState message={loadError} onRetry={load} />;

  const pct = Number(depositPct) || 0;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Set your default deposit and payment due rules. These are applied to every new invoice you create.
      </Text>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.switchTitle}>Require a deposit to confirm bookings</Text>
            <Text style={styles.hint}>Clients pay a % upfront; the balance is due before the event.</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.surface} />
        </View>

        {enabled && (
          <View style={{ marginTop: 16 }}>
            <AcctField label="Deposit required (%)" value={depositPct} onChangeText={v => setDepositPct(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" hint="% of the invoice total required as a deposit" />
            <AcctField label="Deposit due (days before event)" value={depositDays} onChangeText={v => setDepositDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            <AcctField label="Final payment due (days before event)" value={finalDays} onChangeText={v => setFinalDays(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>How this will appear on invoices:</Text>
              <Text style={styles.summaryText}>• Deposit ({pct}%) — due {depositDays || 0} days before the event</Text>
              <Text style={styles.summaryText}>• Final payment ({Math.max(0, 100 - pct)}%) — due {finalDays || 0} days before the event</Text>
            </View>
          </View>
        )}
      </View>

      <AppButton title="Save billing settings" onPress={handleSave} loading={saving} style={{ marginTop: 16 }} />
      <Banner message={message} />
    </ScrollView>
  );
}

function PasswordTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setMessage(null);
    if (!current) { setMessage({ type: 'error', text: 'Enter your current password.' }); return; }
    if (next !== confirm) { setMessage({ type: 'error', text: 'New passwords do not match' }); return; }
    if (next.length < 6) { setMessage({ type: 'error', text: 'Password must be at least 6 characters' }); return; }
    setSaving(true);
    try {
      // Backend verifies the current password before updating, same as the web app.
      await apiRequest('/auth/password', { method: 'PUT', body: { currentPassword: current, newPassword: next } });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} keyboardShouldPersistTaps="handled">
      <AcctField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} />
      <AcctField label="New password" value={next} onChangeText={setNext} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} hint="Must be at least 6 characters" />
      <AcctField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} />
      <TouchableOpacity style={styles.showRow} onPress={() => setShow(s => !s)}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textSecondary} />
        <Text style={styles.showText}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
      </TouchableOpacity>
      <AppButton title="Change password" onPress={handleSave} loading={saving} />
      <Banner message={message} />
    </ScrollView>
  );
}

function AccountTab() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') { setMessage({ type: 'error', text: 'Please type DELETE to confirm' }); return; }
    setDeleting(true);
    setMessage(null);
    try {
      await apiRequest('/auth/account', { method: 'DELETE' });
      await supabase.auth.signOut();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to delete account' });
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} keyboardShouldPersistTaps="handled">
      <View style={styles.danger}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning-outline" size={22} color={Colors.error} />
          <Text style={styles.dangerTitle}>Danger zone</Text>
        </View>
        <Text style={styles.dangerText}>
          Deleting your account is permanent and cannot be undone. This will:
        </Text>
        <Text style={styles.dangerText}>• Permanently delete your profile and personal information</Text>
        <Text style={styles.dangerText}>• Remove your events, bookings and associated data</Text>
        <Text style={styles.dangerText}>• Cancel any active subscriptions</Text>
        <Text style={styles.dangerText}>• Delete client data and communication history</Text>
      </View>

      {!confirming ? (
        <AppButton title="I understand, delete my account" onPress={() => setConfirming(true)} style={{ backgroundColor: Colors.error }} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.dangerText}>To confirm, type DELETE below:</Text>
          <AcctField label="" value={confirmText} onChangeText={setConfirmText} placeholder="Type DELETE to confirm" autoCapitalize="characters" autoCorrect={false} />
          <AppButton
            title="Permanently delete account"
            onPress={handleDelete}
            loading={deleting}
            disabled={confirmText !== 'DELETE'}
            style={{ backgroundColor: Colors.error }}
          />
          <AppButton title="Cancel" variant="ghost" onPress={() => { setConfirming(false); setConfirmText(''); }} disabled={deleting} />
        </View>
      )}
      <Banner message={message} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBarWrap: { backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tabBar: { paddingHorizontal: 8 },
  tab: { paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 19 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 17 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 16, ...Shadow.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  banner: { marginTop: 14, padding: 10, borderRadius: Radius.md, fontSize: 13, overflow: 'hidden' },
  bannerOk: { backgroundColor: Colors.successLight, color: Colors.successText },
  bannerErr: { backgroundColor: Colors.errorLight, color: Colors.errorText },
  signOutBtn: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error, backgroundColor: Colors.errorLight },
  signOutText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
  cover: { width: '100%', height: 110, borderRadius: Radius.md, marginTop: 16, backgroundColor: Colors.borderLight },
  logo: { width: 140, height: 56, marginTop: 12, alignSelf: 'flex-start' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, marginTop: 6 },
  linkText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  summary: { backgroundColor: Colors.infoLight, borderRadius: Radius.md, padding: 12, gap: 2 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: Colors.infoText, marginBottom: 2 },
  summaryText: { fontSize: 13, color: Colors.infoText },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  showText: { fontSize: 13, color: Colors.textSecondary },
  danger: { backgroundColor: Colors.errorLight, borderRadius: Radius.lg, padding: 16, marginBottom: 16, gap: 4 },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: Colors.errorText },
  dangerText: { fontSize: 13, color: Colors.errorText, lineHeight: 19 },
});
