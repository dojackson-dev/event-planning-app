import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { computeAuctionPhase, isPubliclyVisible } from '../auction-phase';
import type { AuctionPhase } from '../auction-phase';
import { checkSlug } from '../auction-slug';
import { AuctionPublicService } from './auction-public.service';
import {
  PUBLIC_AUCTION_COLUMNS_BASE,
  toPublicAuction,
} from './dto/public-views';
import type { PublicAuctionSource, PublicItemSource } from './dto/public-views';

/** Only these organization columns are ever returned; the promoter account id stays server-side. */
const ORG_COLUMNS =
  'id, slug, name, tagline, logo_url, cover_image_url, story, beneficiaries, goal_cents, impact_examples, website_url, contact_email, ein, social, is_published';
const ORG_WITH_PROMOTER = `${ORG_COLUMNS}, promoter_accounts!inner(is_nonprofit, nonprofit_status)`;
const CARD_AUCTION_COLUMNS = `${PUBLIC_AUCTION_COLUMNS_BASE}, organization_id, slug, cover_image_url, accepts_donations, donations_close_at, page_published`;
const SCHEMA_GAP_CODES = new Set(['42703', '42P01', 'PGRST200', 'PGRST205']);
const PHASE_RANK: Record<AuctionPhase, number> = {
  bidding_open: 0,
  accepting_donations: 1,
  preview: 2,
  upcoming: 3,
  closed: 4,
};

export interface PublicOrg {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  story: string | null;
  beneficiaries: string | null;
  goal_cents: number | null;
  impact_examples: Array<{ title: string; text: string }>;
  website_url: string | null;
  contact_email: string | null;
  ein: string | null;
  social: Record<string, string>;
}

export interface PublicAuctionCard {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  phase: AuctionPhase;
  starts_at: string | null;
  ends_at: string | null;
  item_count: number;
  bid_total_cents?: number;
}

type TotalsItem = Pick<
  PublicItemSource,
  | 'sale_mode'
  | 'status'
  | 'current_price_cents'
  | 'bid_count'
  | 'final_price_cents'
  | 'quantity_sold'
  | 'fixed_price_cents'
>;

/** Money won or currently leading across items (sold lots, fixed-price sales, standing high bids). */
export function sumBidTotalCents(items: TotalsItem[]): number {
  let total = 0;
  for (const item of items) {
    if (item.sale_mode === 'fixed') {
      total += (item.fixed_price_cents ?? 0) * (item.quantity_sold ?? 0);
    } else if (item.status === 'sold') {
      total += item.final_price_cents ?? item.current_price_cents;
    } else if (item.status === 'open' && item.bid_count > 0) {
      total += item.current_price_cents;
    }
  }
  return total;
}

function toPublicOrg(row: Record<string, unknown>): PublicOrg {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: (row.tagline as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    story: (row.story as string | null) ?? null,
    beneficiaries: (row.beneficiaries as string | null) ?? null,
    goal_cents: (row.goal_cents as number | null) ?? null,
    impact_examples:
      (row.impact_examples as PublicOrg['impact_examples'] | null) ?? [],
    website_url: (row.website_url as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    ein: (row.ein as string | null) ?? null,
    social: (row.social as Record<string, string> | null) ?? {},
  };
}

/** Public organization pages, slug resolution and the story shown on every auction page. */
@Injectable()
export class AuctionOrgPublicService {
  private readonly logger = new Logger(AuctionOrgPublicService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly publicAuctions: AuctionPublicService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private fail(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  private parseSlug(value: string): string {
    const checked = checkSlug(value);
    if (!checked.ok) throw new NotFoundException('Not found.');
    return checked.slug;
  }

  /** Published organizations of verified non-profits only. A missing table (migration pending) reads as "not found". */
  private async loadOrg(
    column: 'slug' | 'id',
    value: string,
  ): Promise<PublicOrg> {
    const { data, error } = await this.db
      .from('auction_organizations')
      .select(ORG_WITH_PROMOTER)
      .eq(column, value)
      .eq('is_published', true)
      .eq('promoter_accounts.is_nonprofit', true)
      .eq('promoter_accounts.nonprofit_status', 'verified')
      .maybeSingle();
    if (error) {
      if (error.code && SCHEMA_GAP_CODES.has(error.code)) {
        throw new NotFoundException('Not found.');
      }
      this.fail('Organization lookup failed', error.message);
    }
    if (!data) throw new NotFoundException('Not found.');
    return toPublicOrg(data as unknown as Record<string, unknown>);
  }

  private async loadGallery(organizationId: string) {
    const { data, error } = await this.db
      .from('auction_org_gallery')
      .select('id, image_url, caption')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .limit(100);
    if (error) this.fail('Gallery lookup failed', error.message);
    return ((data ?? []) as Array<Record<string, any>>).map((g) => ({
      id: g.id as string,
      image_url: g.image_url as string,
      caption: (g.caption as string | null) ?? null,
    }));
  }

  /** Sponsors appear publicly only with their permission confirmed. */
  private async loadSponsors(organizationId: string) {
    const { data, error } = await this.db
      .from('auction_org_sponsors')
      .select('id, name, logo_url, website_url, tier')
      .eq('organization_id', organizationId)
      .eq('permission_confirmed', true)
      .order('sort_order', { ascending: true })
      .limit(100);
    if (error) this.fail('Sponsor lookup failed', error.message);
    return ((data ?? []) as Array<Record<string, any>>).map((sp) => ({
      id: sp.id as string,
      name: sp.name as string,
      logo_url: (sp.logo_url as string | null) ?? null,
      website_url: (sp.website_url as string | null) ?? null,
      tier: (sp.tier as string | null) ?? null,
    }));
  }

  async getOrganization(slugParam: string) {
    const org = await this.loadOrg('slug', this.parseSlug(slugParam));
    const [gallery, sponsors, auctions] = await Promise.all([
      this.loadGallery(org.id),
      this.loadSponsors(org.id),
      this.loadAuctionCards(org.id),
    ]);
    return { organization: org, gallery, sponsors, auctions };
  }

  private async loadAuctionCards(
    organizationId: string,
  ): Promise<PublicAuctionCard[]> {
    const { data, error } = await this.db
      .from('auctions')
      .select(CARD_AUCTION_COLUMNS)
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) this.fail('Auction list failed', error.message);
    const rows = ((data ?? []) as unknown as PublicAuctionSource[]).filter(
      (row) => isPubliclyVisible(row),
    );
    if (rows.length === 0) return [];

    const { data: itemRows, error: itemError } = await this.db
      .from('auction_items')
      .select(
        'auction_id, sale_mode, status, current_price_cents, bid_count, final_price_cents, quantity_sold, fixed_price_cents',
      )
      .in(
        'auction_id',
        rows.map((r) => r.id),
      )
      .neq('status', 'withdrawn')
      .limit(5000);
    if (itemError) this.fail('Auction item count failed', itemError.message);
    const byAuction = new Map<
      string,
      Array<TotalsItem & { auction_id: string }>
    >();
    for (const item of (itemRows ?? []) as Array<
      TotalsItem & { auction_id: string }
    >) {
      const list = byAuction.get(item.auction_id) ?? [];
      list.push(item);
      byAuction.set(item.auction_id, list);
    }

    const cards = rows.map((row): PublicAuctionCard => {
      const items = byAuction.get(row.id) ?? [];
      const phase = computeAuctionPhase({
        status: row.status,
        accepts_donations: row.accepts_donations,
        donations_close_at: row.donations_close_at,
        hasVisibleItems: items.length > 0,
      });
      const card: PublicAuctionCard = {
        id: row.id,
        slug: row.slug ?? null,
        title: row.title,
        description: row.description,
        cover_image_url: row.cover_image_url ?? null,
        phase,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        item_count: items.length,
      };
      if (phase === 'bidding_open' || phase === 'closed') {
        card.bid_total_cents = sumBidTotalCents(items);
      }
      return card;
    });
    return cards.sort(
      (a, b) =>
        PHASE_RANK[a.phase] - PHASE_RANK[b.phase] ||
        (a.starts_at ?? '').localeCompare(b.starts_at ?? ''),
    );
  }

  /** Maps /auctions/<org-slug>/<auction-slug> to the auction id; 404 unless the org is published and the auction visible. */
  async resolve(orgSlugParam: string, auctionSlugParam: string) {
    const org = await this.loadOrg('slug', this.parseSlug(orgSlugParam));
    const auctionSlug = this.parseSlug(auctionSlugParam);
    const { data, error } = await this.db
      .from('auctions')
      .select('id')
      .eq('organization_id', org.id)
      .eq('slug', auctionSlug)
      .maybeSingle();
    if (error) this.fail('Auction slug lookup failed', error.message);
    if (!data) throw new NotFoundException('Not found.');
    const auctionId = (data as { id: string }).id;
    await this.publicAuctions.loadPublicAuction(auctionId);
    return { auctionId, organizationId: org.id };
  }

  /** Works for legacy auctions too: `organization` is null when the auction has no published organization. */
  async getStory(auctionId: string) {
    const auction = await this.publicAuctions.loadPublicAuction(auctionId);
    const items = await this.publicAuctions.loadItems(auctionId);
    const view = toPublicAuction(auction, items.length);

    let organization: PublicOrg | null = null;
    let gallery: Awaited<ReturnType<typeof this.loadGallery>> = [];
    let sponsors: Awaited<ReturnType<typeof this.loadSponsors>> = [];
    if (auction.organization_id && auction.organization?.is_published) {
      try {
        organization = await this.loadOrg('id', auction.organization_id);
        [gallery, sponsors] = await Promise.all([
          this.loadGallery(organization.id),
          this.loadSponsors(organization.id),
        ]);
      } catch (err) {
        if (!(err instanceof NotFoundException)) throw err;
        organization = null;
      }
    }

    const showTotals = view.phase === 'bidding_open' || view.phase === 'closed';
    return {
      organization,
      gallery,
      sponsors,
      auction: {
        id: view.id,
        slug: view.slug,
        title: view.title,
        description: view.description,
        cover_image_url: view.cover_image_url,
        phase: view.phase,
        status: view.status,
        starts_at: view.starts_at,
        ends_at: view.ends_at,
        accepts_donations: view.accepts_donations,
        donations_close_at: view.donations_close_at,
        org_slug: organization?.slug ?? null,
      },
      goal_cents: organization?.goal_cents ?? null,
      ...(showTotals ? { raised_cents: sumBidTotalCents(items) } : {}),
    };
  }
}
