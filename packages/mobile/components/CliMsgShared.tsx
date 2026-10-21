import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ClientAuthError } from '@/lib/clientApi';
import { Colors, Radius } from '@/lib/theme';

/** Parses 'YYYY-MM-DD' (or a timestamp starting with that) as a local date; other strings fall back to Date. */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00)/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  value?: string | null,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  const d = parseLocalDate(value);
  return d ? d.toLocaleDateString('en-US', opts) : '';
}

/** For real timestamps (messages): always converts from the instant, never treated as a date-only value. */
export function formatStamp(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatMoney(value: unknown): string {
  return `$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Returns a handler that turns an error into a message; expired sessions are sent to client sign-in. */
export function useClientFail() {
  const router = useRouter();
  return useCallback(
    (err: unknown, fallback: string): string => {
      if (err instanceof ClientAuthError) {
        router.replace('/(auth)/client-login' as never);
        return err.message;
      }
      return (err as Error)?.message || fallback;
    },
    [router],
  );
}

type PillTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  success: { bg: Colors.successLight, fg: Colors.successText },
  warning: { bg: Colors.warningLight, fg: Colors.warningText },
  error: { bg: Colors.errorLight, fg: Colors.errorText },
  info: { bg: Colors.infoLight, fg: Colors.infoText },
  neutral: { bg: Colors.borderLight, fg: Colors.textSecondary },
};

export function CliMsgPill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function CliMsgAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </View>
  );
}

/** First screen of a folder's nested Stack has no native back button, so offer one that leaves the folder. */
export function CliMsgBackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(client)' as never))}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  avatar: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primaryText, fontWeight: '700' },
});
