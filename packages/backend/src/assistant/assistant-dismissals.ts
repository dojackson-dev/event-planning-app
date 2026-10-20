import type { AssistantPriority } from './assistant-summary';

export interface DismissalRow {
  item_key: string;
  kind: 'snooze' | 'handled';
  until: string | null;
  fingerprint: string;
}

export interface HiddenPriority {
  key: string;
  title: string;
  kind: 'snooze' | 'handled';
  until: string | null;
}

/**
 * A snooze hides a line until its date; "handled" hides it only while its contents are unchanged,
 * so new overdue invoices or a changed deadline bring it back. Neither touches the underlying records.
 */
export function applyDismissals(
  priorities: AssistantPriority[],
  rows: DismissalRow[],
  today: string,
): { visible: AssistantPriority[]; hidden: HiddenPriority[] } {
  const byKey = new Map(rows.map((r) => [r.item_key, r]));
  const visible: AssistantPriority[] = [];
  const hidden: HiddenPriority[] = [];
  for (const p of priorities) {
    const row = byKey.get(p.key);
    const hides =
      !!row &&
      (row.kind === 'snooze'
        ? !!row.until && row.until > today
        : row.fingerprint === p.fingerprint);
    if (hides) {
      hidden.push({
        key: p.key,
        title: p.title,
        kind: row.kind,
        until: row.kind === 'snooze' ? row.until : null,
      });
    } else {
      visible.push(p);
    }
  }
  return { visible, hidden };
}
