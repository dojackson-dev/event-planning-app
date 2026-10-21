import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { checkSlug } from '../auction-slug';
import { AuctionAdminService } from './auction-admin.service';
import {
  MAX_GALLERY_IMAGES,
  MAX_SPONSORS,
  parseGalleryInput,
  parseOrderIds,
  parseOrganizationInput,
  parseSponsorInput,
} from './dto/org-input';

export interface OrganizationRow {
  id: string;
  promoter_account_id: string;
  slug: string;
  name: string;
  [key: string]: unknown;
}

type ChildTable = 'auction_org_gallery' | 'auction_org_sponsors';

const SLUG_TAKEN = 'That web address is already taken.';

/** Organizer-side organization profile, gallery and sponsors. Every query is scoped to the caller's promoter account. */
@Injectable()
export class AuctionOrgService {
  private readonly logger = new Logger(AuctionOrgService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly admin: AuctionAdminService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private fail(op: string, error: { code?: string }): never {
    this.logger.error(`${op} failed (${error.code ?? 'db_error'})`);
    if (error.code === '23505') throw new ConflictException(SLUG_TAKEN);
    if (error.code === '23514') {
      throw new BadRequestException('That change breaks a profile rule.');
    }
    throw new InternalServerErrorException('Could not save the change.');
  }

  private async findOrg(promoterId: string): Promise<OrganizationRow | null> {
    const { data, error } = await this.db
      .from('auction_organizations')
      .select('*')
      .eq('promoter_account_id', promoterId)
      .maybeSingle();
    if (error) this.fail('findOrganization', error);
    return (data as OrganizationRow | null) ?? null;
  }

  private async requireOrg(userId: string): Promise<OrganizationRow> {
    const promoter = await this.admin.getPromoterAccount(userId);
    const org = await this.findOrg(promoter.id);
    if (!org) {
      throw new NotFoundException('Set up your organization profile first.');
    }
    return org;
  }

  private async children(table: ChildTable, organizationId: string) {
    const { data, error } = await this.db
      .from(table)
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) this.fail(`list ${table}`, error);
    return (data ?? []) as Array<Record<string, unknown> & { id: string }>;
  }

  private async withChildren(org: OrganizationRow) {
    const [gallery, sponsors] = await Promise.all([
      this.children('auction_org_gallery', org.id),
      this.children('auction_org_sponsors', org.id),
    ]);
    return { ...org, gallery, sponsors };
  }

  // ─── organization ────────────────────────────────────────────

  async getMine(userId: string) {
    const promoter = await this.admin.getPromoterAccount(userId);
    const org = await this.findOrg(promoter.id);
    return org ? this.withChildren(org) : null;
  }

  private async slugTakenByOther(
    slug: string,
    ownOrgId: string | null,
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from('auction_organizations')
      .select('id')
      .eq('slug', slug)
      .limit(2);
    if (error) this.fail('slugLookup', error);
    return ((data ?? []) as Array<{ id: string }>).some(
      (row) => row.id !== ownOrgId,
    );
  }

  async slugAvailable(
    userId: string,
    slug: unknown,
  ): Promise<{ available: boolean; reason?: string }> {
    const promoter = await this.admin.getPromoterAccount(userId);
    const checked = checkSlug(slug);
    if (!checked.ok) return { available: false, reason: checked.reason };
    const own = await this.findOrg(promoter.id);
    return (await this.slugTakenByOther(checked.slug, own?.id ?? null))
      ? { available: false, reason: SLUG_TAKEN }
      : { available: true };
  }

  async upsert(userId: string, dto: unknown) {
    const promoter = await this.admin.getPromoterAccount(userId);
    const existing = await this.findOrg(promoter.id);
    const input = parseOrganizationInput(dto, !existing);

    if (
      input.slug &&
      input.slug !== existing?.slug &&
      (await this.slugTakenByOther(input.slug, existing?.id ?? null))
    ) {
      throw new ConflictException(SLUG_TAKEN);
    }

    if (!existing) {
      const { data, error } = await this.db
        .from('auction_organizations')
        .insert({
          ein: promoter.nonprofit_ein ?? undefined,
          ...input,
          promoter_account_id: promoter.id,
        })
        .select('*')
        .single();
      if (error || !data) this.fail('createOrganization', error ?? {});
      return this.withChildren(data as OrganizationRow);
    }

    if (!Object.keys(input).length) return this.withChildren(existing);
    const { data, error } = await this.db
      .from('auction_organizations')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('promoter_account_id', promoter.id)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateOrganization', error);
    if (!data) throw new NotFoundException('Organization not found.');
    return this.withChildren(data as OrganizationRow);
  }

  // ─── gallery and sponsors ────────────────────────────────────

  private async addChild(
    table: ChildTable,
    userId: string,
    values: Record<string, unknown>,
    max: number,
  ) {
    const org = await this.requireOrg(userId);
    const existing = await this.children(table, org.id);
    if (existing.length >= max) {
      throw new BadRequestException(`You can add up to ${max} entries.`);
    }
    const nextOrder = existing.length
      ? Math.max(...existing.map((row) => Number(row.sort_order) || 0)) + 1
      : 0;
    const { data, error } = await this.db
      .from(table)
      .insert({ ...values, organization_id: org.id, sort_order: nextOrder })
      .select('*')
      .single();
    if (error || !data) this.fail(`add ${table}`, error ?? {});
    return data;
  }

  private async updateChild(
    table: ChildTable,
    userId: string,
    id: string,
    values: Record<string, unknown>,
  ) {
    const org = await this.requireOrg(userId);
    if (!Object.keys(values).length) {
      const rows = await this.children(table, org.id);
      const row = rows.find((r) => r.id === id);
      if (!row) throw new NotFoundException('Not found.');
      return row;
    }
    const { data, error } = await this.db
      .from(table)
      .update(values)
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('*')
      .maybeSingle();
    if (error) this.fail(`update ${table}`, error);
    if (!data) throw new NotFoundException('Not found.');
    return data;
  }

  private async deleteChild(table: ChildTable, userId: string, id: string) {
    const org = await this.requireOrg(userId);
    const { data, error } = await this.db
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', org.id)
      .select('id');
    if (error) this.fail(`delete ${table}`, error);
    if (!((data ?? []) as unknown[]).length) {
      throw new NotFoundException('Not found.');
    }
    return { ok: true };
  }

  /** Listed ids come first in the given order; anything not listed keeps its place after them. */
  private async reorderChildren(
    table: ChildTable,
    userId: string,
    raw: unknown,
    max: number,
  ) {
    const org = await this.requireOrg(userId);
    const ids = parseOrderIds(raw, max);
    const rows = await this.children(table, org.id);
    const known = new Set(rows.map((r) => r.id));
    if (!ids.every((id) => known.has(id))) {
      throw new BadRequestException('ids must belong to your organization.');
    }
    const listed = new Set(ids);
    const order = [
      ...ids,
      ...rows.map((r) => r.id).filter((id) => !listed.has(id)),
    ];
    for (let index = 0; index < order.length; index += 1) {
      const { error } = await this.db
        .from(table)
        .update({ sort_order: index })
        .eq('id', order[index])
        .eq('organization_id', org.id);
      if (error) this.fail(`reorder ${table}`, error);
    }
    return this.children(table, org.id);
  }

  async addGalleryImage(userId: string, dto: unknown) {
    const input = parseGalleryInput(dto, true);
    return this.addChild(
      'auction_org_gallery',
      userId,
      { ...input },
      MAX_GALLERY_IMAGES,
    );
  }

  async updateGalleryImage(userId: string, id: string, dto: unknown) {
    const input = parseGalleryInput(dto, false);
    return this.updateChild('auction_org_gallery', userId, id, { ...input });
  }

  async deleteGalleryImage(userId: string, id: string) {
    return this.deleteChild('auction_org_gallery', userId, id);
  }

  async reorderGallery(userId: string, dto: unknown) {
    return this.reorderChildren(
      'auction_org_gallery',
      userId,
      dto,
      MAX_GALLERY_IMAGES,
    );
  }

  async addSponsor(userId: string, dto: unknown) {
    const input = parseSponsorInput(dto, true);
    return this.addChild(
      'auction_org_sponsors',
      userId,
      { ...input },
      MAX_SPONSORS,
    );
  }

  async updateSponsor(userId: string, id: string, dto: unknown) {
    const input = parseSponsorInput(dto, false);
    return this.updateChild('auction_org_sponsors', userId, id, { ...input });
  }

  async deleteSponsor(userId: string, id: string) {
    return this.deleteChild('auction_org_sponsors', userId, id);
  }

  async reorderSponsors(userId: string, dto: unknown) {
    return this.reorderChildren(
      'auction_org_sponsors',
      userId,
      dto,
      MAX_SPONSORS,
    );
  }
}
