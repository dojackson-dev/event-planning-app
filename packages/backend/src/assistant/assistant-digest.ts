import type { AssistantSummary } from './assistant-summary';

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const MAX_LINES = 5;

/** HTML for MailService.sendReminderEmail; every record-derived string is escaped. Null when there is nothing to say. */
export function buildDigestEmail(
  summary: AssistantSummary,
  baseUrl: string,
): { subject: string; body: string } | null {
  if (summary.priorities.length === 0 && summary.upcomingEvents.length === 0)
    return null;

  const link = (href: string, text: string) =>
    `<a href="${escapeHtml(baseUrl + href)}" style="color:#4f46e5;">${escapeHtml(text)}</a>`;

  const parts: string[] = [`<strong>${escapeHtml(summary.headline)}</strong>`];

  if (summary.priorities.length > 0) {
    parts.push('', '<strong>Needs your attention</strong>');
    for (const p of summary.priorities.slice(0, MAX_LINES)) {
      parts.push(
        `\u2022 ${escapeHtml(p.title)} \u2014 ${link(p.href, p.actionLabel)}`,
      );
      for (const r of p.reasons)
        parts.push(
          `&nbsp;&nbsp;${r.actor === 'you' ? 'Your action' : r.actor === 'vendor' ? 'Awaiting vendor' : 'Awaiting client'}: ${escapeHtml(r.text)}`,
        );
    }
    const more = summary.priorities.length - MAX_LINES;
    if (more > 0)
      parts.push(`${link('/dashboard', `${more} more on your dashboard`)}`);
  }

  if (summary.upcomingEvents.length > 0) {
    parts.push('', '<strong>Coming up</strong>');
    for (const e of summary.upcomingEvents)
      parts.push(
        `\u2022 ${link(e.href, e.name)} \u2014 ${escapeHtml(e.date)}${e.notes.length ? ` (${escapeHtml(e.notes.join(', '))})` : ''}`,
      );
  }

  parts.push(
    '',
    `You get this briefing because it is switched on in your dashboard assistant. ${link('/dashboard', 'Open your dashboard')} to turn it off.`,
  );

  return {
    subject: `Your EventEcos briefing: ${summary.headline.replace(/\.$/, '')}`,
    body: parts.join('\n'),
  };
}
