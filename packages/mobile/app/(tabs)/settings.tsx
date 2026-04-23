import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';

type Tab = 'profile' | 'billing' | 'password';

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface PaymentSchedule {
  deposit_percentage: number;
  deposit_due_days: number;
  final_payment_days: number;
  require_deposit: boolean;
}

export default function SettingsScreen() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(['profile', 'billing', 'password'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'profile' ? 'Profile' : t === 'billing' ? 'Billing' : 'Password'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'password' && <PasswordTab />}
    </View>
  );
}

function ProfileTab() {
  const [profile, setProfile] = useState<Profile>({ first_name: '', last_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setProfile(prev => ({ ...prev, email: user.email || '' }));
        const { data } = await supabase
          .from('owner_profiles')
          .select('first_name, last_name, phone')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setProfile(prev => ({ ...prev, first_name: data.first_name || '', last_name: data.last_name || '', phone: data.phone || '' }));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('owner_profiles')
        .upsert({ user_id: user.id, first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone }, { onConflict: 'user_id' });
      if (error) throw error;
      Alert.alert('Saved', 'Profile updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <View style={styles.section}>
        <Text style={styles.label}>First Name</Text>
        <TextInput style={styles.input} value={profile.first_name} onChangeText={v => setProfile(p => ({ ...p, first_name: v }))} placeholder="First name" placeholderTextColor={Colors.textMuted} />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput style={styles.input} value={profile.last_name} onChangeText={v => setProfile(p => ({ ...p, last_name: v }))} placeholder="Last name" placeholderTextColor={Colors.textMuted} />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={profile.email} editable={false} keyboardType="email-address" />
        <Text style={styles.hint}>Email cannot be changed here</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={profile.phone} onChangeText={v => setProfile(p => ({ ...p, phone: v }))} placeholder="+1 (555) 000-0000" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
      </View>
      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={async () => {
        Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
        ]);
      }}>
        <Ionicons name="log-out-outline" size={18} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BillingTab() {
  const [schedule, setSchedule] = useState<PaymentSchedule>({ deposit_percentage: 25, deposit_due_days: 30, final_payment_days: 7, require_deposit: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<PaymentSchedule>('/owner/payment-schedule');
        if (data) setSchedule(data);
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/owner/payment-schedule', { method: 'PUT', body: schedule });
      Alert.alert('Saved', 'Payment schedule updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Deposit Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Require Deposit</Text>
          <Switch value={schedule.require_deposit} onValueChange={v => setSchedule(p => ({ ...p, require_deposit: v }))} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#FFF" />
        </View>
        {schedule.require_deposit && (
          <>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Deposit Percentage</Text>
              <View style={styles.numericInput}>
                <TextInput style={styles.numericText} value={String(schedule.deposit_percentage)} onChangeText={v => setSchedule(p => ({ ...p, deposit_percentage: parseFloat(v) || 0 }))} keyboardType="decimal-pad" />
                <Text style={styles.numericSuffix}>%</Text>
              </View>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Deposit Due (days after booking)</Text>
              <View style={styles.numericInput}>
                <TextInput style={styles.numericText} value={String(schedule.deposit_due_days)} onChangeText={v => setSchedule(p => ({ ...p, deposit_due_days: parseInt(v) || 0 }))} keyboardType="number-pad" />
                <Text style={styles.numericSuffix}>days</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Final Payment</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Days before event</Text>
          <View style={styles.numericInput}>
            <TextInput style={styles.numericText} value={String(schedule.final_payment_days)} onChangeText={v => setSchedule(p => ({ ...p, final_payment_days: parseInt(v) || 0 }))} keyboardType="number-pad" />
            <Text style={styles.numericSuffix}>days</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled, { marginTop: 24 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Payment Schedule</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function PasswordTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (next.length < 8) { Alert.alert('Validation', 'Password must be at least 8 characters.'); return; }
    if (next !== confirm) { Alert.alert('Validation', 'Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      Alert.alert('Saved', 'Password updated successfully.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <View style={styles.section}>
        <Text style={styles.label}>New Password</Text>
        <TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={Colors.textMuted} />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat new password" placeholderTextColor={Colors.textMuted} />
      </View>
      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.textPrimary },
  inputDisabled: { opacity: 0.6 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  settingLabel: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  numericInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  numericText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, minWidth: 36, textAlign: 'right' },
  numericSuffix: { fontSize: 13, color: Colors.textMuted, marginLeft: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  signOutBtn: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.error + '50', backgroundColor: Colors.error + '08' },
  signOutText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
});
