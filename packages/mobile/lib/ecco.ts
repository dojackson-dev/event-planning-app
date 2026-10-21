export type EccoRole = 'owner' | 'promoter' | 'vendor' | 'artist';
export type Severity = 'urgent' | 'attention' | 'info';

export interface EccoItem { label: string; detail: string; href: string }
export interface EccoTask {
  key: string;
  label: string;
  count: number;
  amount?: number;
  severity: Severity;
  href: string;
  items: EccoItem[];
}
export interface EccoEvent {
  id: string;
  name: string;
  date: string;
  startTime: string | null;
  href: string;
  notes: string[];
}
export interface PriorityReason { text: string; actor: 'you' | 'client' }
export interface DraftTarget { type: 'invoice' | 'estimate' | 'contract'; id: string; label: string }
export interface EccoPriority {
  key: string;
  severity: Severity;
  title: string;
  reasons: PriorityReason[];
  href: string;
  actionLabel: string;
  fingerprint: string;
  targets: DraftTarget[];
}
export interface HiddenPriority { key: string; title: string; kind: 'snooze' | 'handled'; until: string | null }
export interface EccoActivity { text: string; at: string; href: string }
export interface EccoSummary {
  generatedAt: string;
  headline: string;
  allClear: boolean;
  upcomingEvents: EccoEvent[];
  priorities: EccoPriority[];
  recentActivity: EccoActivity[];
  tasks: EccoTask[];
  hidden: HiddenPriority[];
  suggestedQuestions: string[];
  canDismiss: boolean;
}
export interface EccoAnswer { intent: string | null; answer: string; items: EccoItem[] }
export interface EccoDraft { to: string; subject: string; body: string }

const WEB_URL = 'https://eventecos.com';

// Ecco returns web paths. Each rule maps one to the matching mobile screen;
// anything unmatched is opened on the web instead of dead-ending.
type Rule = [RegExp, (m: RegExpMatchArray) => string];

const OWNER_RULES: Rule[] = [
  [/^\/dashboard\/invoices\/([^/?]+)/, (m) => `/(tabs)/invoices/${m[1]}`],
  [/^\/dashboard\/invoices/, () => '/(tabs)/invoices'],
  [/^\/dashboard\/estimates\/([^/?]+)/, (m) => `/(tabs)/estimates/${m[1]}`],
  [/^\/dashboard\/estimates/, () => '/(tabs)/estimates'],
  [/^\/dashboard\/contracts\/([^/?]+)/, (m) => `/(tabs)/contracts/${m[1]}`],
  [/^\/dashboard\/contracts/, () => '/(tabs)/contracts'],
  [/^\/dashboard\/events\/([^/?]+)/, (m) => `/(tabs)/events/${m[1]}`],
  [/^\/dashboard\/events/, () => '/(tabs)/events'],
  [/^\/dashboard\/clients/, () => '/(tabs)/clients'],
  [/^\/dashboard\/vendors\/payments/, () => '/(tabs)/vendor-invoices'],
  [/^\/dashboard\/vendors/, () => '/(tabs)/vendors'],
  [/^\/dashboard\/?$/, () => '/(tabs)/dashboard'],
];

const PROMOTER_RULES: Rule[] = [
  [/^\/dashboard\/promoter\/events\/([^/?]+)/, (m) => `/(promoter)/events/${m[1]}`],
  [/^\/dashboard\/promoter\/events/, () => '/(promoter)/events'],
  [/^\/dashboard\/promoter\/invoices\/([^/?]+)/, (m) => `/(promoter)/invoices/${m[1]}`],
  [/^\/dashboard\/promoter\/invoices/, () => '/(promoter)/invoices'],
  [/^\/dashboard\/promoter\/bookings/, () => '/(promoter)/bookings'],
  [/^\/dashboard\/promoter\/?$/, () => '/(promoter)'],
];

const VENDOR_RULES: Rule[] = [
  [/^\/vendors\/dashboard\/invoices\/([^/?]+)/, (m) => `/(vendor)/invoices/${m[1]}`],
  [/^\/vendors\/dashboard\/invoices/, () => '/(vendor)/invoices'],
  [/^\/vendors\/dashboard\/bookings\/([^/?]+)/, (m) => `/(vendor)/bookings/${m[1]}`],
  [/^\/vendors\/dashboard\/bookings/, () => '/(vendor)/bookings'],
  [/^\/vendors\/dashboard\/?$/, () => '/(vendor)'],
];

const ARTIST_RULES: Rule[] = [
  [/^\/artist\/dashboard\/invoices\/([^/?]+)/, (m) => `/(artist)/invoices/${m[1]}`],
  [/^\/artist\/dashboard\/invoices/, () => '/(artist)/invoices'],
  [/^\/artist\/dashboard\/bookings\/([^/?]+)/, (m) => `/(artist)/bookings/${m[1]}`],
  [/^\/artist\/dashboard\/bookings/, () => '/(artist)/bookings'],
  [/^\/artist\/dashboard\/?$/, () => '/(artist)'],
];

const RULES: Record<EccoRole, Rule[]> = {
  owner: OWNER_RULES,
  promoter: PROMOTER_RULES,
  vendor: VENDOR_RULES,
  artist: ARTIST_RULES,
};

export type EccoTarget = { kind: 'app'; path: string } | { kind: 'web'; url: string };

export function resolveEccoHref(role: EccoRole, href: string): EccoTarget {
  for (const [re, build] of RULES[role]) {
    const m = href.match(re);
    if (m) return { kind: 'app', path: build(m) };
  }
  return { kind: 'web', url: `${WEB_URL}${href.startsWith('/') ? href : `/${href}`}` };
}

export const snoozeUntil = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export const formatEccoDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
