import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius, Shadow } from '@/lib/theme';
import EccoAsk from '@/components/EccoAsk';
import EccoDraftModal from '@/components/EccoDraftModal';
import {
  resolveEccoHref, snoozeUntil, formatEccoDate,
  type EccoDraft, type EccoPriority, type EccoRole, type EccoSummary, type DraftTarget, type Severity,
} from '@/lib/ecco';

const SEVERITY_COLOR: Record<Severity, string> = {
  urgent: Colors.error,
  attention: Colors.warning,
  info: Colors.info,
};

const SNOOZE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
];

const INITIAL_PRIORITIES = 5;

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  role: EccoRole;
  /** Bump to re-fetch (e.g. after a pull-to-refresh on the host screen). */
  refreshKey?: number;
};

// Ecco, the EventEcos assistant. The same /assistant API the web dashboard uses;
// records are never changed from here and drafts are only ever shared by the user.
export default function EccoAssistant({ role, refreshKey = 0 }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<EccoSummary | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [menu, setMenu] = useState<{ key: string; mode: 'snooze' | 'draft' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [draft, setDraft] = useState<EccoDraft | null>(null);
  const [digest, setDigest] = useState<boolean | null>(null);
  const [digestError, setDigestError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(false);
    try {
      setSummary(await apiRequest<EccoSummary>(`/assistant/summary?role=${role}`));
      if (!quiet) {
        // The AI note is optional and slower, so it fills in after the summary is on screen.
        apiRequest<{ text: string | null }>(`/assistant/narrative?role=${role}`, { timeoutMs: 15000 })
          .then((r) => setNarrative(r?.text ?? null))
          .catch(() => setNarrative(null));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load(refreshKey > 0);
  }, [load, refreshKey]);

  useEffect(() => {
    // The email briefing is built for owners only.
    if (role !== 'owner') return;
    apiRequest<{ digestEnabled: boolean }>('/assistant/preferences')
      .then((r) => setDigest(!!r?.digestEnabled))
      .catch(() => setDigest(null));
  }, [role]);

  const open = (href: string) => {
    const target = resolveEccoHref(role, href);
    if (target.kind === 'app') router.push(target.path as any);
    else Linking.openURL(target.url).catch(() => {});
  };

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true);
    setActionError('');
    try {
      await action();
      setMenu(null);
      await load(true);
    } catch (err: any) {
      setActionError(err?.message || failure);
    } finally {
      setBusy(false);
    }
  };

  const snooze = (p: EccoPriority, days: number) =>
    run(() => apiRequest('/assistant/dismiss', { method: 'POST', body: { role, key: p.key, kind: 'snooze', until: snoozeUntil(days) } }), 'Could not snooze this item.');

  const markHandled = (p: EccoPriority) =>
    run(() => apiRequest('/assistant/dismiss', { method: 'POST', body: { role, key: p.key, kind: 'handled' } }), 'Could not hide this item.');

  const restore = (key: string) =>
    run(() => apiRequest(`/assistant/dismiss/${encodeURIComponent(key)}?role=${role}`, { method: 'DELETE' }), 'Could not restore this item.');

  const openDraft = async (target: DraftTarget) => {
    setBusy(true);
    setActionError('');
    try {
      setDraft(await apiRequest<EccoDraft>('/assistant/draft', { method: 'POST', body: { type: target.type, id: target.id } }));
      setMenu(null);
    } catch (err: any) {
      setActionError(err?.message || 'Could not prepare a draft.');
    } finally {
      setBusy(false);
    }
  };

  const toggleDigest = async (enabled: boolean) => {
    setDigestError('');
    try {
      const r = await apiRequest<{ digestEnabled: boolean }>('/assistant/preferences', { method: 'PUT', body: { digestEnabled: enabled } });
      setDigest(!!r?.digestEnabled);
    } catch (err: any) {
      setDigestError(err?.message || 'Could not update your email preference.');
    }
  };

  const priorities = summary?.priorities ?? [];
  const visible = showAll ? priorities : priorities.slice(0, INITIAL_PRIORITIES);
  const hiddenCount = priorities.length - INITIAL_PRIORITIES;
  const canExpand = hiddenCount > 0 || (summary?.tasks.length ?? 0) > 0;

  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
          <Text style={styles.title}>Ecco</Text>
          <Text style={styles.subtitle}>your EventEcos assistant</Text>
        </View>
        {summary && (
          <TouchableOpacity onPress={() => load(true)} hitSlop={10} accessibilityLabel="Refresh Ecco">
            <Text style={styles.updated}>
              Updated {new Date(summary.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : error || !summary ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Ecco couldn't load your summary right now.</Text>
          <TouchableOpacity onPress={() => load()}><Text style={styles.link}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.body}>
          <View>
            <Text style={styles.headline}>{summary.headline}</Text>
            {!!narrative && (
              <Text style={styles.narrative}>{narrative} <Text style={styles.ai}>AI-generated</Text></Text>
            )}
          </View>

          {summary.allClear && (
            <View style={styles.clearRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.clearText}>Nothing is waiting on you.</Text>
            </View>
          )}

          {!!actionError && <Text style={styles.actionError} accessibilityRole="alert">{actionError}</Text>}

          {priorities.length > 0 && (
            <View>
              <Text style={styles.section}>Needs attention</Text>
              <View style={styles.list}>
                {visible.map((p, i) => (
                  <View key={p.key} style={[styles.priority, i > 0 && styles.divider]}>
                    <View style={styles.priorityTop}>
                      <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[p.severity] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.priorityTitle}>{p.title}</Text>
                        {p.reasons.map((r) => (
                          <View key={r.text} style={styles.reasonRow}>
                            <Text style={[styles.actor, r.actor === 'you' ? styles.actorYou : styles.actorClient]}>
                              {r.actor === 'you' ? 'Your action' : 'Awaiting client'}
                            </Text>
                            <Text style={styles.reasonText}>{r.text}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => open(p.href)}>
                        <Text style={styles.primaryAction}>{p.actionLabel}</Text>
                      </TouchableOpacity>
                      {p.targets.length > 0 && (
                        <TouchableOpacity
                          disabled={busy}
                          onPress={() => p.targets.length === 1
                            ? openDraft(p.targets[0])
                            : setMenu(menu?.key === p.key && menu.mode === 'draft' ? null : { key: p.key, mode: 'draft' })}
                        >
                          <Text style={styles.action}>Draft follow-up</Text>
                        </TouchableOpacity>
                      )}
                      {summary.canDismiss && (
                        <>
                          <TouchableOpacity
                            disabled={busy}
                            onPress={() => setMenu(menu?.key === p.key && menu.mode === 'snooze' ? null : { key: p.key, mode: 'snooze' })}
                          >
                            <Text style={styles.action}>Snooze</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={busy} onPress={() => markHandled(p)}>
                            <Text style={styles.action}>Mark handled</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    {menu?.key === p.key && menu.mode === 'snooze' && (
                      <View style={styles.menuRow}>
                        <Text style={styles.menuLabel}>Remind me in:</Text>
                        {SNOOZE_OPTIONS.map((o) => (
                          <TouchableOpacity key={o.days} style={styles.pill} disabled={busy} onPress={() => snooze(p, o.days)}>
                            <Text style={styles.pillText}>{o.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {menu?.key === p.key && menu.mode === 'draft' && (
                      <View style={styles.menuRow}>
                        <Text style={styles.menuLabel}>Follow up about:</Text>
                        {p.targets.map((t) => (
                          <TouchableOpacity key={t.id} style={styles.pill} disabled={busy} onPress={() => openDraft(t)}>
                            <Text style={styles.pillText}>{t.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
              {canExpand && (
                <TouchableOpacity onPress={() => setShowAll((v) => !v)} style={styles.expand}>
                  <Text style={styles.link}>
                    {showAll ? 'Show fewer' : hiddenCount > 0 ? `Show all tasks (${hiddenCount} more)` : 'Show all tasks'}
                  </Text>
                  <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {summary.hidden.length > 0 && (
            <View>
              <TouchableOpacity onPress={() => setShowHidden((v) => !v)}>
                <Text style={styles.muted}>
                  {showHidden ? 'Hide' : 'Show'} {summary.hidden.length} snoozed or handled {summary.hidden.length === 1 ? 'item' : 'items'}
                </Text>
              </TouchableOpacity>
              {showHidden && summary.hidden.map((h) => (
                <View key={h.key} style={styles.hiddenRow}>
                  <Text style={[styles.muted, { flex: 1 }]} numberOfLines={1}>
                    {h.title} · {h.kind === 'snooze' && h.until ? `snoozed until ${formatEccoDate(h.until)}` : 'handled'}
                  </Text>
                  <TouchableOpacity disabled={busy} onPress={() => restore(h.key)}>
                    <Text style={styles.link}>Restore</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showAll && summary.tasks.length > 0 && (
            <View>
              <Text style={styles.section}>Everything outstanding</Text>
              <View style={styles.list}>
                {summary.tasks.map((t, i) => (
                  <TouchableOpacity key={t.key} style={[styles.taskRow, i > 0 && styles.divider]} onPress={() => open(t.href)}>
                    <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[t.severity] }]} />
                    <Text style={styles.taskLabel} numberOfLines={1}>{t.label}</Text>
                    <Text style={styles.count}>{t.count}</Text>
                    {!!t.amount && <Text style={styles.muted}>{money(t.amount)}</Text>}
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {summary.upcomingEvents.length > 0 && (
            <View>
              <Text style={styles.section}>Coming up</Text>
              {summary.upcomingEvents.map((e) => (
                <TouchableOpacity key={e.id} style={styles.eventRow} onPress={() => open(e.href)}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.priorityTitle} numberOfLines={1}>{e.name}</Text>
                    <Text style={styles.muted}>
                      {formatEccoDate(e.date)}{e.startTime ? ` · ${e.startTime}` : ''}
                      {e.notes.length > 0 ? ` · ${e.notes.join(', ')}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {summary.recentActivity.length > 0 && (
            <View>
              <Text style={styles.section}>Recent activity</Text>
              {summary.recentActivity.map((a) => (
                <TouchableOpacity key={`${a.href}-${a.at}`} style={styles.activityRow} onPress={() => open(a.href)}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.activityText}>
                    {a.text} <Text style={styles.muted}>· {new Date(a.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <EccoAsk role={role} suggestions={summary.suggestedQuestions} onOpen={open} />

          {digest !== null && (
            <View style={styles.digest}>
              <View style={styles.digestRow}>
                <Text style={styles.muted}>Email me Ecco's briefing every morning</Text>
                <Switch value={digest} onValueChange={toggleDigest} />
              </View>
              {!!digestError && <Text style={styles.actionError}>{digestError}</Text>}
            </View>
          )}
        </View>
      )}

      {draft && <EccoDraftModal draft={draft} onClose={() => setDraft(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, marginBottom: 16, overflow: 'hidden' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },
  updated: { fontSize: 11, color: Colors.textMuted },
  center: { padding: 24, alignItems: 'center' },
  errorRow: { padding: 14, gap: 8 },
  errorText: { fontSize: 14, color: Colors.textSecondary },
  body: { padding: 14, gap: 18 },
  headline: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  narrative: { fontSize: 13, color: Colors.textSecondary, marginTop: 6 },
  ai: { fontSize: 11, color: Colors.textMuted },
  clearRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearText: { fontSize: 14, color: Colors.successText },
  actionError: { fontSize: 13, color: Colors.error },
  section: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  list: { borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.lg },
  divider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  priority: { padding: 12 },
  priorityTop: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  priorityTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  actor: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm, overflow: 'hidden' },
  actorYou: { backgroundColor: Colors.primaryLight, color: Colors.primary },
  actorClient: { backgroundColor: Colors.borderLight, color: Colors.textSecondary },
  reasonText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10, marginLeft: 18 },
  primaryAction: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  action: { fontSize: 13, color: Colors.textSecondary },
  menuRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, marginLeft: 18 },
  menuLabel: { fontSize: 12, color: Colors.textSecondary },
  pill: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 12, color: Colors.textPrimary },
  expand: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  link: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  muted: { fontSize: 12, color: Colors.textSecondary },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  taskLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  count: {
    fontSize: 12, fontWeight: '700', color: Colors.textPrimary, backgroundColor: Colors.borderLight,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },
  eventRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.lg,
  },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  activityText: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  digest: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  digestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
