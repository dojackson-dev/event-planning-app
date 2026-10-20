import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import LoadingState from '@/components/LoadingState';
import AcctErrorState from '@/components/AcctErrorState';
import AcctField from '@/components/AcctField';
import AppButton from '@/components/AppButton';

interface TeamMember {
  id: string; // membership id
  role: string;
  created_at?: string;
  user: { id: string; email: string; first_name: string | null; last_name: string | null } | null;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamScreen() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([
        apiRequest<TeamMember[]>('/team/members'),
        apiRequest<TeamInvitation[]>('/team/invitations'),
      ]);
      setMembers(Array.isArray(m) ? m : []);
      setInvitations(Array.isArray(i) ? i : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load team.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    setInviteMessage(null);
    if (!EMAIL_REGEX.test(email)) {
      setInviteMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    setInviting(true);
    try {
      await apiRequest('/team/invite', { method: 'POST', body: { email } });
      setInviteMessage({ type: 'success', text: `Invitation sent to ${email}` });
      setInviteEmail('');
      await load();
    } catch (err: any) {
      setInviteMessage({ type: 'error', text: err?.message || 'Failed to send invitation' });
    } finally {
      setInviting(false);
    }
  };

  const memberName = (m: TeamMember) =>
    `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || m.user?.email || 'Team member';

  const removeMember = (m: TeamMember) => {
    if (!m.user) return;
    const userId = m.user.id;
    Alert.alert('Remove member', `Remove ${memberName(m)} from your team? They will lose access immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusyId(m.id);
          try {
            await apiRequest(`/team/members/${userId}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(x => x.id !== m.id));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to remove member');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const cancelInvite = (inv: TeamInvitation) => {
    Alert.alert('Cancel invitation', `Cancel the invitation to ${inv.email}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel invitation',
        style: 'destructive',
        onPress: async () => {
          setBusyId(inv.id);
          try {
            await apiRequest(`/team/invitations/${inv.id}`, { method: 'DELETE' });
            setInvitations(prev => prev.filter(x => x.id !== inv.id));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to cancel invitation');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const resendInvite = async (inv: TeamInvitation) => {
    setBusyId(inv.id);
    try {
      await apiRequest(`/team/invitations/${inv.id}/resend`, { method: 'POST' });
      setInviteMessage({ type: 'success', text: `Invitation resent to ${inv.email}` });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend invitation');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Loading team…" />;
  if (error && members.length === 0 && invitations.length === 0) {
    return <AcctErrorState message={error} onRetry={() => { setLoading(true); load(); }} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <Text style={styles.intro}>
        Invite associates to view your venue dashboard. Associates can see everything except billing and account settings.
      </Text>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Invite an associate</Text>
        <AcctField
          label=""
          value={inviteEmail}
          onChangeText={setInviteEmail}
          placeholder="colleague@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppButton title="Send invite" onPress={handleInvite} loading={inviting} disabled={!inviteEmail.trim()} />
        {inviteMessage && (
          <Text style={[styles.banner, inviteMessage.type === 'success' ? styles.bannerOk : styles.bannerErr]}>{inviteMessage.text}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active members ({members.length})</Text>
        {members.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No team members yet. Invite someone above.</Text>
          </View>
        ) : members.map(m => (
          <View key={m.id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(m.user?.first_name?.[0] || m.user?.email?.[0] || '?').toUpperCase()}{m.user?.last_name?.[0]?.toUpperCase() || ''}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{memberName(m)}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{m.user?.email}</Text>
            </View>
            <View style={styles.rolePill}><Text style={styles.rolePillText}>{m.role}</Text></View>
            {busyId === m.id ? <ActivityIndicator size="small" color={Colors.primary} /> : (
              <TouchableOpacity onPress={() => removeMember(m)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {invitations.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending invitations ({invitations.length})</Text>
          {invitations.map(inv => (
            <View key={inv.id} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="mail-outline" size={16} color={Colors.warningText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{inv.email}</Text>
                <Text style={styles.rowSub}>
                  Sent {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                </Text>
              </View>
              {busyId === inv.id ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                <View style={styles.inviteActions}>
                  <TouchableOpacity onPress={() => resendInvite(inv)} hitSlop={10}>
                    <Ionicons name="refresh" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => cancelInvite(inv)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 19 },
  inlineError: { color: Colors.errorText, backgroundColor: Colors.errorLight, padding: 10, borderRadius: Radius.md, marginBottom: 12, fontSize: 13 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 16, ...Shadow.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  banner: { marginTop: 12, padding: 10, borderRadius: Radius.md, fontSize: 13, overflow: 'hidden' },
  bannerOk: { backgroundColor: Colors.successLight, color: Colors.successText },
  bannerErr: { backgroundColor: Colors.errorLight, color: Colors.errorText },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: Colors.primaryText },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  rolePill: { backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  rolePillText: { fontSize: 11, fontWeight: '700', color: Colors.infoText, textTransform: 'capitalize' },
  inviteActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});
