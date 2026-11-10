export type ScoreLabel = 'hot' | 'warm' | 'cold';

export interface ScoreInput {
  lead_type: string | null;
  source: string | null;
  business_name: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

const TYPE_POINTS: Record<string, number> = {
  event_owner: 20,
  venue_owner: 20,
  caterer: 20,
  vendor: 20,
  promoter: 15,
  artist: 8,
  other: 5,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ranks how promising a lead is (0-100). Event owners, caterers and vendors
 * score highest because they bring the most growth; someone who asked for a
 * demo, and asked recently, beats a cold list entry. Complete contact details
 * and a business name add points because they make the lead easier to work.
 */
export function scoreLead(
  lead: ScoreInput,
  now: number = Date.now(),
): { score: number; label: ScoreLabel } {
  let score = 0;
  if (lead.status === 'won') return { score: 100, label: 'hot' };
  if (lead.status === 'lost') return { score: 0, label: 'cold' };

  score += TYPE_POINTS[lead.lead_type ?? ''] ?? 0;

  if (lead.source === 'demo_request') {
    score += 30;
    const age = now - Date.parse(lead.created_at);
    if (age <= 7 * DAY_MS) score += 15;
    else if (age <= 30 * DAY_MS) score += 8;
  } else if (lead.source === 'referral') {
    score += 20;
  }

  if (lead.business_name) score += 8;
  if (lead.email) score += 8;
  if (lead.website) score += 4;
  if (lead.city) score += 4;
  if (lead.description) score += 5;
  if (lead.status === 'contacted') score += 8;

  score = Math.min(100, score);
  return { score, label: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold' };
}
