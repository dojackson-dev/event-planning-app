/**
 * HTML templates for the signup email automation sequence.
 * Pure functions: (key, data) -> { subject, html }. No I/O here — the
 * scheduled-emails service decides *when* to send and *whether* to send;
 * this file only decides *what* the email looks like.
 */

export type PortalType = 'owner' | 'artist' | 'vendor' | 'promoter';

export type EmailTemplateKey =
  | 'welcome_shareable_link'
  | 'venue_owner_quick_start'
  | 'artist_quick_start'
  | 'vendor_quick_start'
  | 'promoter_quick_start'
  | 'profile_incomplete'
  | 'venue_first_action'
  | 'artist_first_action'
  | 'vendor_first_action'
  | 'promoter_first_action'
  | 'weekly_digest'
  | 'inactive_user_reengagement';

export interface EmailTemplateData {
  firstName: string;
  businessName?: string;
  portalType: PortalType;
  shareableUrl?: string;
  dashboardUrl: string;
  profileCompletionPercentage?: number;
  missingProfileItems?: string[];
  profileViews?: number;
  linkClicks?: number;
  newInquiries?: number;
  newConnections?: number;
  upcomingEventCount?: number;
  openTaskCount?: number;
  /** Signed, one-click unsubscribe link included in every email footer. */
  unsubscribeUrl?: string;
}

const PORTAL_LABEL: Record<PortalType, string> = {
  owner: 'Venue',
  artist: 'Artist',
  vendor: 'Vendor',
  promoter: 'Promoter',
};

const QUICK_START_STEPS: Record<PortalType, string[]> = {
  owner: [
    'Add photos and a description of your venue',
    'Set your availability calendar',
    'Create your first event',
    'Share your booking page with clients',
  ],
  artist: [
    'Upload your media, photos, or press kit',
    'Add your genres and booking contact info',
    'Set your rate range',
    'Share your artist profile link',
  ],
  vendor: [
    'Add your services and pricing',
    'Upload photos of your work',
    'Set your service area',
    'Share your vendor profile link',
  ],
  promoter: [
    'Add your company details',
    'Connect with a venue partner',
    'Create your first event',
    'Share your promoter profile link',
  ],
};

const FIRST_ACTION_COPY: Record<
  PortalType,
  { subject: string; body: string; cta: string }
> = {
  owner: {
    subject: "You haven't created your first event yet",
    body: "Your venue profile is live, but you haven't created an event yet. Creating your first event only takes a couple of minutes and lets clients start booking with you.",
    cta: 'Create your first event',
  },
  artist: {
    subject: 'Finish your artist profile to start getting booked',
    body: "Promoters and venues can't book you until your artist profile is complete. Add your media, genres, and booking contact info to start getting inquiries.",
    cta: 'Complete your profile',
  },
  vendor: {
    subject: 'Finish your vendor profile to start getting booked',
    body: "Clients can't find or book you until your vendor profile is complete. Add your services, pricing, and photos to start getting inquiries.",
    cta: 'Complete your profile',
  },
  promoter: {
    subject: "You haven't created your first event yet",
    body: "Your promoter profile is live, but you haven't created an event yet. Creating your first event only takes a couple of minutes.",
    cta: 'Create your first event',
  },
};

function wrapper(
  title: string,
  subtitle: string | undefined,
  bodyHtml: string,
  unsubscribeUrl?: string,
): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px 16px;">
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #00BFA5 0%, #26C485 50%, #1E3A7F 100%); padding: 32px 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">${title}</h1>
          ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${subtitle}</p>` : ''}
        </div>
        <div style="padding:32px;">
          ${bodyHtml}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
            This is an automated message from EventEcos. Please do not reply to this email.
            ${unsubscribeUrl ? `<br/><a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe from these emails</a>` : ''}
          </p>
        </div>
      </div>
    </div>
  `;
}

function button(url: string, label: string): string {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}"
         style="display:inline-block;background:#2563eb;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
        ${label}
      </a>
    </div>
  `;
}

function stepList(steps: string[]): string {
  return `
    <div style="background:#f0f4ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:0 0 20px;">
      <ol style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
        ${steps.map((s) => `<li>${s}</li>`).join('')}
      </ol>
    </div>
  `;
}

export function renderTemplate(
  key: EmailTemplateKey,
  data: EmailTemplateData,
): { subject: string; html: string } {
  const label = PORTAL_LABEL[data.portalType];
  const name = data.firstName || 'there';

  switch (key) {
    case 'welcome_shareable_link': {
      const body = `
        <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Welcome to EventEcos! Your ${label.toLowerCase()} account is ready. Here's your shareable profile link —
          send it to clients and partners so they can find and book you.
        </p>
        ${
          data.shareableUrl
            ? `<div style="background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;padding:14px 18px;margin:0 0 20px;font-size:14px;color:#2563eb;word-break:break-all;">${data.shareableUrl}</div>`
            : ''
        }
        ${button(data.shareableUrl || data.dashboardUrl, 'View my shareable link')}
      `;
      return {
        subject: "Welcome to EventEcos — here's your shareable link",
        html: wrapper(
          'Welcome to EventEcos',
          `Your ${label} account is ready`,
          body,
          data.unsubscribeUrl,
        ),
      };
    }

    case 'venue_owner_quick_start':
    case 'artist_quick_start':
    case 'vendor_quick_start':
    case 'promoter_quick_start': {
      const body = `
        <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Here's a quick checklist to get the most out of your ${label} account:
        </p>
        ${stepList(QUICK_START_STEPS[data.portalType])}
        ${button(data.dashboardUrl, 'Go to my dashboard')}
      `;
      return {
        subject: `Quick start guide for your ${label} account`,
        html: wrapper(
          'Getting Started',
          `${label} quick start guide`,
          body,
          data.unsubscribeUrl,
        ),
      };
    }

    case 'profile_incomplete': {
      const items = data.missingProfileItems ?? [];
      const pct = data.profileCompletionPercentage ?? 0;
      const body = `
        <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Your ${label.toLowerCase()} profile is <strong>${pct}% complete</strong>. A complete profile gets found more
          often and booked more often.
        </p>
        ${items.length ? stepList(items) : ''}
        ${button(data.dashboardUrl, 'Finish my profile')}
      `;
      return {
        subject: 'Your EventEcos profile is almost ready',
        html: wrapper(
          'Finish Setting Up',
          'Your profile is almost ready',
          body,
          data.unsubscribeUrl,
        ),
      };
    }

    case 'venue_first_action':
    case 'artist_first_action':
    case 'vendor_first_action':
    case 'promoter_first_action': {
      const copy = FIRST_ACTION_COPY[data.portalType];
      const body = `
        <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">${copy.body}</p>
        ${button(data.dashboardUrl, copy.cta)}
      `;
      return {
        subject: copy.subject,
        html: wrapper(
          'Keep the momentum going',
          undefined,
          body,
          data.unsubscribeUrl,
        ),
      };
    }

    case 'weekly_digest': {
      const rows: Array<[string, number | undefined]> = [
        ['Profile views', data.profileViews],
        ['Link clicks', data.linkClicks],
        ['New inquiries', data.newInquiries],
        ['New connections', data.newConnections],
        ['Upcoming events', data.upcomingEventCount],
        ['Open tasks', data.openTaskCount],
      ];
      const table = rows
        .filter(([, v]) => v !== undefined)
        .map(
          ([label2, v]) =>
            `<tr><td style="padding:6px 0;color:#6b7280;">${label2}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${v}</td></tr>`,
        )
        .join('');
      const body = `
        <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">Here's your week on EventEcos:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">${table}</table>
        ${button(data.dashboardUrl, 'View my dashboard')}
      `;
      return {
        subject: 'Your weekly EventEcos summary',
        html: wrapper(
          'Your Weekly Summary',
          undefined,
          body,
          data.unsubscribeUrl,
        ),
      };
    }

    case 'inactive_user_reengagement': {
      const body = `
        <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
          It's been a while since you've been active on EventEcos. Your ${label.toLowerCase()} profile is still live —
          here's what's waiting for you when you're ready to jump back in.
        </p>
        ${button(data.dashboardUrl, 'Come back to my dashboard')}
      `;
      return {
        subject: 'We miss you at EventEcos',
        html: wrapper('We Miss You', undefined, body, data.unsubscribeUrl),
      };
    }
  }
}
