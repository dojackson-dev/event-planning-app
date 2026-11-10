export const OUTREACH_TEMPLATES = {
  intro_demo: {
    label: 'Intro and live demo',
    subject: 'See EventEcos in action',
  },
  custom: {
    label: 'Personal message',
    subject: '',
  },
} as const;

export type OutreachTemplateId = keyof typeof OUTREACH_TEMPLATES;

export const BRAND_SITE = 'https://eventecos.com';
export const DEMO_URL = 'https://demo.eventecos.com/demo';
const LOGO_URL = `${BRAND_SITE}/lib/EventEcos-Logo-Only.jpg`;
const SUPPORT_EMAIL = 'support@eventecos.com';

export interface OutreachRecipient {
  name: string;
  business: string | null;
}

export interface OutreachRenderInput {
  template: OutreachTemplateId;
  subject: string;
  /** A personal paragraph. Shown above the feature cards in the intro template. */
  note?: string | null;
  /** The body of a personal message. */
  message?: string | null;
  cta?: { label: string; url: string } | null;
  recipient: OutreachRecipient;
  senderName: string;
  unsubscribeUrl: string;
  postalAddress?: string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

function tokenValues(input: OutreachRenderInput): Record<string, string> {
  return {
    firstName: firstNameOf(input.recipient.name),
    name: input.recipient.name.trim() || 'there',
    business: input.recipient.business?.trim() || 'your business',
    senderName: input.senderName,
  };
}

/** Replaces {{firstName}}, {{name}}, {{business}} and {{senderName}}. Unknown tokens are left as typed. */
export function applyTokens(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );
}

/** Personal text becomes safe HTML: tokens are filled with escaped values, line breaks are kept. */
function paragraphsHtml(text: string, values: Record<string, string>): string {
  const escapedValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, escapeHtml(value)]),
  );
  return escapeHtmlKeepingTokens(text)
    .split(/\n{2,}/)
    .map((block) => applyTokens(block, escapedValues).replace(/\n/g, '<br>'))
    .map(
      (block) =>
        `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">${block}</p>`,
    )
    .join('');
}

function escapeHtmlKeepingTokens(text: string): string {
  return escapeHtml(text.replace(/\r\n?/g, '\n').trim());
}

/** The subject is one line: tokens filled, line breaks and control characters removed. */
export function renderSubject(
  subject: string,
  values: Record<string, string>,
): string {
  // eslint-disable-next-line no-control-regex
  const control = /[\u0000-\u001f\u007f]+/g;
  return applyTokens(subject, values)
    .replace(control, ' ')
    .trim()
    .slice(0, 150);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function button(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#34c27a;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>`;
}

const FEATURES: Array<{
  bg: string;
  icon: string;
  title: string;
  text: string;
}> = [
  {
    bg: '#dbeafe',
    icon: '\u{1F4C5}',
    title: 'Events &amp; Bookings',
    text: 'Track every booking and event from inquiry to day-of.',
  },
  {
    bg: '#d1fae5',
    icon: '\u{1F4C4}',
    title: 'Contracts &amp; Invoices',
    text: 'Send e-signature contracts and collect payments through Stripe.',
  },
  {
    bg: '#ede9fe',
    icon: '\u{1F39F}\uFE0F',
    title: 'Tickets, Guest Lists &amp; Vendors',
    text: 'Sell tickets, manage door check-in and coordinate your vendors.',
  },
];

function featureCards(): string {
  return FEATURES.map(
    (f) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:12px;">
                <tr>
                  <td width="56" valign="top" style="padding:16px 0 16px 16px;">
                    <div style="width:40px;height:40px;line-height:40px;text-align:center;background:${f.bg};border-radius:20px;font-size:18px;">${f.icon}</div>
                  </td>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${f.title}</p>
                    <p style="margin:4px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">${f.text}</p>
                  </td>
                </tr>
              </table>`,
  ).join('');
}

function layout(
  title: string,
  body: string,
  input: Pick<OutreachRenderInput, 'unsubscribeUrl' | 'postalAddress'>,
): string {
  const address = input.postalAddress?.trim()
    ? `<p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">${escapeHtml(input.postalAddress.trim())}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:16px 28px;border-bottom:1px solid #e5e7eb;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <img src="${LOGO_URL}" alt="EventEcos" width="48" style="display:block;height:auto;border:0;">
                  </td>
                  <td align="right">
                    <a href="${BRAND_SITE}" style="color:#111827;font-size:13px;font-weight:500;text-decoration:none;margin-left:14px;">Website</a>
                    <a href="${DEMO_URL}" style="color:#0e7ac4;font-size:13px;font-weight:600;text-decoration:none;margin-left:14px;">Live Demo</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${body}
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:12px;">EventEcos &middot; Discover events, find your perfect space, and bring your plans to life.</p>
              ${address}
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#9ca3af;">${SUPPORT_EMAIL}</a>
                &middot; <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function signature(senderName: string): string {
  return `<p style="margin:24px 0 0;color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(senderName)}<br><span style="color:#6b7280;">EventEcos</span></p>`;
}

export function renderOutreach(input: OutreachRenderInput): {
  subject: string;
  html: string;
  text: string;
} {
  const values = tokenValues(input);
  const subject =
    renderSubject(input.subject, values) ||
    OUTREACH_TEMPLATES.intro_demo.subject;
  const note = input.note?.trim() ? input.note : null;
  const cta = input.cta ?? null;
  const footerText = [
    'EventEcos',
    input.postalAddress?.trim() || null,
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  if (input.template === 'intro_demo') {
    const body = `
          <tr>
            <td style="background:#f0f9f6;padding:44px 32px 40px;">
              <p style="margin:0 0 14px;color:#0e7ac4;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Go out. Get together.</p>
              <h1 style="margin:0 0 18px;color:#111827;font-size:40px;line-height:1.1;font-weight:800;">
                Great experiences<br>
                <span style="color:#34c27a;">start here.</span>
              </h1>
              <p style="margin:0 0 28px;color:#4b5563;font-size:16px;line-height:1.7;">
                Hi ${escapeHtml(values.firstName)}, EventEcos brings your bookings, contracts, invoices, payments, guest lists and vendors into one connected event ecosystem, so you can spend less time on admin and more time on great events.
              </p>
              ${button('See the Live Demo \u2192', cta?.url ?? DEMO_URL)}
              <p style="margin:14px 0 0;color:#6b7280;font-size:12px;">No signup needed. Explore a fully loaded demo environment.</p>
            </td>
          </tr>${
            note
              ? `
          <tr>
            <td style="padding:28px 32px 0;background:#ffffff;">
              ${paragraphsHtml(note, values)}${signature(input.senderName)}
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding:36px 32px 8px;background:#ffffff;">
              <h2 style="margin:0 0 20px;color:#111827;font-size:20px;font-weight:700;">What you'll see in the demo</h2>${featureCards()}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 40px;background:#ffffff;" align="center">
              <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
                Take a few minutes to click around. If it looks like a fit, just reply to this email and I'll help you get set up.
              </p>
              ${button('Launch Live Demo', cta?.url ?? DEMO_URL)}
              <p style="margin:18px 0 0;">
                <a href="${BRAND_SITE}" style="color:#0e7ac4;font-size:13px;font-weight:600;text-decoration:none;">Or learn more at eventecos.com</a>
              </p>
            </td>
          </tr>`;
    const text = [
      `Hi ${values.firstName},`,
      '',
      note
        ? `${applyTokens(note.trim(), values)}\n\n${input.senderName}\nEventEcos\n`
        : '',
      'EventEcos brings your bookings, contracts, invoices, payments, guest lists and vendors into one connected event ecosystem, so you can spend less time on admin and more time on great events.',
      '',
      `See the live demo (no signup needed): ${cta?.url ?? DEMO_URL}`,
      '',
      "If it looks like a fit, just reply to this email and I'll help you get set up.",
      '',
      footerText,
    ].join('\n');
    return { subject, html: layout(subject, body, input), text };
  }

  const message = input.message?.trim() ?? '';
  const body = `
          <tr>
            <td style="padding:36px 32px 32px;background:#ffffff;">
              ${paragraphsHtml(message, values)}${
                cta
                  ? `<p style="margin:8px 0 0;">${button(cta.label, cta.url)}</p>`
                  : ''
              }${signature(input.senderName)}
            </td>
          </tr>`;
  const text = [
    applyTokens(message.replace(/\r\n?/g, '\n'), values),
    cta ? `\n${cta.label}: ${cta.url}` : '',
    `\n${input.senderName}\nEventEcos\n`,
    footerText,
  ].join('\n');
  return { subject, html: layout(subject, body, input), text };
}
