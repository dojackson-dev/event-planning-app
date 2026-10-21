import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { ClientAuthError } from '@/lib/clientApi';

// Shared helpers/UI for the client-portal document screens (estimates, contracts, invoices).

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Read a field accepting snake_case or camelCase keys. */
export function pick(o: any, key: string): any {
  if (!o || typeof o !== 'object') return undefined;
  const v = o[key];
  return v !== undefined && v !== null ? v : o[camel(key)];
}

export const num = (v: any): number => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const money = (v: any): string =>
  `$${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 'YYYY-MM-DD' is parsed as a local date (not UTC) so it never shifts a day. */
export function parseLocalDate(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(s?: string | null): string {
  const d = parseLocalDate(s);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function fmtDateTime(s?: string | null): string {
  const d = parseLocalDate(s);
  return d
    ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
}

/** Whole days from now until the end of the given local date (negative = past). */
export function daysUntil(s?: string | null): number | null {
  const d = parseLocalDate(s);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return (d.getTime() - Date.now()) / 86_400_000;
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'",
  ndash: '–', mdash: '—', hellip: '…', bull: '•', copy: '©',
};

/** Converts contract HTML to readable plain text. Output is rendered in <Text>, never as markup. */
export function htmlToText(html?: string | null): string {
  let s = String(html ?? '');
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol|table|section|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/t[dh]>/gi, '  ')
    .replace(/<[^>]*>/g, '');
  s = s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/&amp;/gi, '&');
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export type Tone = { bg: string; text: string; dot: string };
const TONES: Record<string, Tone> = {
  gray: { bg: Colors.borderLight, text: Colors.textSecondary, dot: Colors.textMuted },
  blue: { bg: Colors.infoLight, text: Colors.infoText, dot: Colors.info },
  green: { bg: Colors.successLight, text: Colors.successText, dot: Colors.success },
  red: { bg: Colors.errorLight, text: Colors.errorText, dot: Colors.error },
  orange: { bg: Colors.warningLight, text: Colors.warningText, dot: Colors.warning },
  purple: { bg: Colors.purpleLight, text: Colors.purpleText, dot: Colors.purple },
};

export type StatusCfg = { label: string; tone: keyof typeof TONES };

export const ESTIMATE_STATUS: Record<string, StatusCfg> = {
  draft: { label: 'Draft', tone: 'gray' },
  sent: { label: 'Sent', tone: 'blue' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  expired: { label: 'Expired', tone: 'orange' },
  converted: { label: 'Converted', tone: 'purple' },
};

export const CONTRACT_STATUS: Record<string, StatusCfg> = {
  draft: { label: 'Draft', tone: 'gray' },
  sent: { label: 'Awaiting Signature', tone: 'blue' },
  signed: { label: 'Signed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  voided: { label: 'Waived', tone: 'orange' },
};

export const INVOICE_STATUS: Record<string, StatusCfg> = {
  sent: { label: 'Awaiting Payment', tone: 'blue' },
  partial: { label: 'Partial', tone: 'orange' },
  overdue: { label: 'Overdue', tone: 'red' },
  paid: { label: 'Paid', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
};

export function CliDocBadge({ cfg }: { cfg: StatusCfg }) {
  const t = TONES[cfg.tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text style={[styles.badgeText, { color: t.text }]}>{cfg.label}</Text>
    </View>
  );
}

export function CliDocError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMsg}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function CliDocChips({
  options, value, onChange,
}: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} style={styles.chipsScroll}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function CliDocCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CliDocRow({
  label, value, bold, color,
}: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

/** Sends the user to client sign-in when the client session expired. Returns true if handled. */
export function useClientAuthRedirect() {
  const router = useRouter();
  return useCallback((err: unknown): boolean => {
    if (err instanceof ClientAuthError) {
      router.replace('/(auth)/client-login' as never);
      return true;
    }
    return false;
  }, [router]);
}

/**
 * Loads data with loading / pull-to-refresh / error states. Auth expiry redirects to sign-in.
 * `refetchOnActive` silently reloads when the app returns to the foreground (e.g. after paying).
 */
export function useCliDocLoad<T>(load: () => Promise<T>, opts: { refetchOnActive?: boolean } = {}) {
  const redirectOnAuth = useClientAuthRedirect();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const mounted = useRef(true);
  const seq = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'pull' | 'silent') => {
    const id = ++seq.current;
    if (mode === 'initial') { setLoading(true); setError(null); }
    if (mode === 'pull') setRefreshing(true);
    try {
      const res = await loadRef.current();
      if (!mounted.current || id !== seq.current) return;
      setData(res);
      setError(null);
    } catch (err: any) {
      if (!mounted.current || id !== seq.current) return;
      if (redirectOnAuth(err)) return;
      if (mode !== 'silent') setError(err?.message || 'Could not load. Please try again.');
    } finally {
      if (mounted.current && id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [redirectOnAuth]);

  useEffect(() => {
    mounted.current = true;
    run('initial');
    return () => { mounted.current = false; };
  }, [run]);

  useEffect(() => {
    if (!opts.refetchOnActive) return;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run('silent'); });
    return () => sub.remove();
  }, [opts.refetchOnActive, run]);

  return {
    data, setData, loading, refreshing, error,
    reload: () => run('initial'),
    refresh: () => run('pull'),
    silentReload: () => run('silent'),
  };
}

export const cliDocStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  muted: { fontSize: 12, color: Colors.textMuted },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12,
    paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.surface,
  },
});

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  errorTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  errorMsg: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  retryText: { color: Colors.textWhite, fontWeight: '600', fontSize: 14 },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, gap: 8, ...Shadow.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 14, color: Colors.textSecondary, flexShrink: 1 },
  rowValue: { fontSize: 14, color: Colors.textPrimary },
  rowBold: { fontWeight: '700', color: Colors.textPrimary },
});
