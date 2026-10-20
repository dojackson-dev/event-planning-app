import { ReactNode } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
  ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';

// Shared helpers + small UI pieces for the money & documents screens
// (invoices, estimates, contracts, vendor invoices, payments, billing, items).

export const FRONTEND_URL = 'https://eventecos.com';

// ── Data helpers ────────────────────────────────────────────────────────────

export const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const cap = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';

export const errMsg = (e: any, fallback: string) => (e && e.message) || fallback;

const toSnakeKey = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/**
 * Some endpoints return raw snake_case rows, others camelCase. Returns a deep
 * copy that keeps every original key and adds a snake_case alias for each
 * camelCase key (original wins when both exist), so screens can read
 * snake_case only.
 */
export function toSnake<T = any>(value: any): T {
  if (Array.isArray(value)) return value.map(toSnake) as any;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const key of Object.keys(value)) out[key] = toSnake(value[key]);
    for (const key of Object.keys(value)) {
      const sk = toSnakeKey(key);
      if (sk !== key && !(sk in out)) out[sk] = out[key];
    }
    return out;
  }
  return value;
}

export const asArray = <T = any,>(data: any, ...keys: string[]): T[] => {
  if (Array.isArray(data)) return toSnake<T[]>(data);
  for (const k of keys) if (Array.isArray(data?.[k])) return toSnake<T[]>(data[k]);
  return [];
};

export const fmtMoney = (v: any, decimals = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(num(v));

// Accepts 'YYYY-MM-DD' or full ISO timestamps. Date-only values are parsed at
// noon so the day never shifts with the device timezone.
export const parseDate = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (s?: string | null, long = false) => {
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: long ? 'long' : 'short', day: 'numeric', year: 'numeric' });
};

export const isPastDue = (due?: string | null) => {
  const d = parseDate(due);
  if (!d) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const plusDaysISO = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// ── Status tones ────────────────────────────────────────────────────────────

export type Tone = { bg: string; text: string; dot: string };

const TONES: Record<string, Tone> = {
  neutral: { bg: Colors.borderLight, text: Colors.textSecondary, dot: Colors.textMuted },
  info: { bg: Colors.infoLight, text: Colors.infoText, dot: Colors.info },
  purple: { bg: Colors.purpleLight, text: Colors.purpleText, dot: Colors.purple },
  success: { bg: Colors.successLight, text: Colors.successText, dot: Colors.success },
  warning: { bg: Colors.warningLight, text: Colors.warningText, dot: Colors.warning },
  error: { bg: Colors.errorLight, text: Colors.errorText, dot: Colors.error },
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  draft: 'neutral', cancelled: 'neutral', canceled: 'neutral', inactive: 'neutral', none: 'neutral',
  sent: 'info', processing: 'info', trialing: 'info', trial: 'info',
  viewed: 'purple', converted: 'purple',
  paid: 'success', approved: 'success', signed: 'success', active: 'success',
  partial: 'warning', expired: 'warning', pending: 'warning', past_due: 'warning',
  overdue: 'error', rejected: 'error', voided: 'error',
};

export const statusTone = (status?: string | null): Tone =>
  TONES[STATUS_TONE[(status || '').toLowerCase()] || 'neutral'];

export const toneByName = (name: keyof typeof TONES): Tone => TONES[name];

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const t = statusTone(status);
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <View style={[s.dot, { backgroundColor: t.dot }]} />
      <Text style={[s.badgeText, { color: t.text }]}>{label || cap(status) || 'Unknown'}</Text>
    </View>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.centered}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={s.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.banner}>
      <Ionicons name="alert-circle-outline" size={18} color={Colors.errorText} />
      <Text style={s.bannerText} numberOfLines={2}>{message}</Text>
      {onRetry && <Text style={s.bannerLink} onPress={onRetry}>Retry</Text>}
    </View>
  );
}

export function SearchBar({
  value, onChangeText, placeholder,
}: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={s.search}>
      <Ionicons name="search" size={16} color={Colors.textMuted} />
      <TextInput
        style={s.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {!!value && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function FilterChips({
  options, value, onChange,
}: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow} style={s.chipScroll}>
      {options.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[s.chip, value === o.key && s.chipActive]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[s.chipText, value === o.key && s.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export function SummaryRow({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={s.summaryRow}>
      {items.map(i => (
        <View key={i.label} style={s.summaryCard}>
          <Text style={s.summaryLabel}>{i.label}</Text>
          <Text style={[s.summaryValue, i.color ? { color: i.color } : null]} numberOfLines={1} adjustsFontSizeToFit>
            {i.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

export function InfoRow({
  label, value, valueColor, last, bold,
}: { label: string; value: string; valueColor?: string; last?: boolean; bold?: boolean }) {
  return (
    <View style={[s.infoRow, last && s.infoRowLast]}>
      <Text style={[s.infoLabel, bold && s.infoBold]}>{label}</Text>
      <Text style={[s.infoValue, bold && s.infoBold, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

type ActionTone = 'primary' | 'success' | 'danger' | 'neutral';

export function ActionButton({
  icon, label, onPress, tone = 'primary', loading, disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void;
  tone?: ActionTone; loading?: boolean; disabled?: boolean;
}) {
  const palette = {
    primary: { bg: Colors.primaryLight, fg: Colors.primaryDark },
    success: { bg: Colors.successLight, fg: Colors.successText },
    danger: { bg: Colors.errorLight, fg: Colors.errorText },
    neutral: { bg: Colors.borderLight, fg: Colors.textPrimary },
  }[tone];
  return (
    <TouchableOpacity
      style={[s.actionBtn, { backgroundColor: palette.bg }, (disabled || loading) && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator size="small" color={palette.fg} />
        : <Ionicons name={icon} size={16} color={palette.fg} />}
      <Text style={[s.actionBtnText, { color: palette.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Bottom-sheet style form used for quick single-purpose input (record payment,
// edit fields). Children supply the inputs.
export function FormSheet({
  visible, title, onClose, onSubmit, submitLabel, submitting, children,
}: {
  visible: boolean; title: string; onClose: () => void; onSubmit: () => void;
  submitLabel: string; submitting?: boolean; children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            {children}
          </ScrollView>
          <TouchableOpacity
            style={[s.sheetSubmit, submitting && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={Colors.textWhite} />
              : <Text style={s.sheetSubmitText}>{submitLabel}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Field({
  label, ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        {...props}
        style={[s.fieldInput, props.multiline && { minHeight: 72, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export const finStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20, marginBottom: 16, ...Shadow.md,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  headerNum: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  headerName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  headerAmount: { fontSize: 34, fontWeight: '800', color: Colors.textPrimary },
  progressBg: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 12, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
  progressText: { fontSize: 13, color: Colors.textMuted },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  lineRow: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  lineDesc: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  lineMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lineAmt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  bodyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, marginBottom: 10, ...Shadow.sm },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  cardNum: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  cardAmount: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, ...Shadow.sm,
  },
  newBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  emptyBtnText: { color: Colors.textWhite, fontWeight: '600' },
});

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24, gap: 12 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.full },
  retryBtnText: { color: Colors.textWhite, fontWeight: '600' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.errorLight,
    borderRadius: Radius.md, padding: 10, marginHorizontal: 16, marginTop: 8,
  },
  bannerText: { flex: 1, fontSize: 13, color: Colors.errorText },
  bannerLink: { fontSize: 13, fontWeight: '700', color: Colors.errorText },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 0 },

  chipScroll: { flexGrow: 0 },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, ...Shadow.sm },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  infoBold: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },

  actionBtn: {
    flexGrow: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: Radius.md, padding: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: 20, maxHeight: '85%', gap: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  sheetSubmit: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  sheetSubmitText: { color: Colors.textWhite, fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  fieldInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
});
