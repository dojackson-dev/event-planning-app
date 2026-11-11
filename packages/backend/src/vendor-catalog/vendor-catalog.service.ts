import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CatalogItemFields,
  IncludedItem,
  RequestedItem,
  UNIT_SUFFIX,
  CatalogUnit,
  sanitizeCatalogItem,
  sanitizeIncludes,
  sanitizeRequestedInput,
} from './vendor-catalog-helpers';

export interface CatalogItemRow extends CatalogItemFields {
  id: string;
  vendor_account_id: string;
  name: string;
  kind: 'item' | 'package';
  unit: CatalogUnit;
  price: number;
  hide_price: boolean;
  is_active: boolean;
  sort_order: number;
}

const bySectionThenOrder = (a: any, b: any) => {
  const sa = a.section ?? '\uffff';
  const sb = b.section ?? '\uffff';
  return (
    String(sa).localeCompare(String(sb), undefined, { sensitivity: 'base' }) ||
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    String(a.name).localeCompare(String(b.name), undefined, {
      sensitivity: 'base',
    })
  );
};

@Injectable()
export class VendorCatalogService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get admin() {
    return this.supabaseService.getAdminClient();
  }

  private async vendorAccountId(userId: string): Promise<string> {
    const { data } = await this.admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      throw new ForbiddenException('No vendor account found for this user');
    }
    return data.id as string;
  }

  /** Attaches "includes" (name + quantity) to every package in `items`. */
  private async withIncludes(items: any[]) {
    const packageIds = items
      .filter((i) => i.kind === 'package')
      .map((i) => i.id);
    const links = packageIds.length
      ? (((
          await this.admin
            .from('vendor_package_items')
            .select('package_id, item_id, quantity')
            .in('package_id', packageIds)
        ).data ?? []) as any[])
      : [];
    const nameById = new Map(items.map((i) => [i.id, i.name as string]));
    // Included items may not be in `items` (a single package, or an inactive item), so look them up.
    const missing = [
      ...new Set(
        links.map((l) => l.item_id as string).filter((id) => !nameById.has(id)),
      ),
    ];
    if (missing.length > 0) {
      const { data } = await this.admin
        .from('vendor_items')
        .select('id, name')
        .in('id', missing);
      for (const row of (data ?? []) as any[]) {
        nameById.set(row.id, row.name as string);
      }
    }
    return items.map((item) => ({
      ...item,
      price: Number(item.price),
      includes:
        item.kind === 'package'
          ? links
              .filter((l) => l.package_id === item.id)
              .map((l) => ({
                item_id: l.item_id as string,
                name: nameById.get(l.item_id) ?? 'Item',
                quantity: Number(l.quantity),
              }))
          : [],
    }));
  }

  // ─── Vendor ────────────────────────────────────────────────────────────────

  async list(userId: string) {
    const vendorId = await this.vendorAccountId(userId);
    const [{ data: items }, { data: vendor }] = await Promise.all([
      this.admin
        .from('vendor_items')
        .select('*')
        .eq('vendor_account_id', vendorId)
        .order('created_at', { ascending: true }),
      this.admin
        .from('vendor_accounts')
        .select('show_catalog_to_clients')
        .eq('id', vendorId)
        .maybeSingle(),
    ]);
    const rows = (items ?? []).sort(bySectionThenOrder);
    return {
      show_to_clients: !!vendor?.show_catalog_to_clients,
      items: await this.withIncludes(rows),
    };
  }

  private async checkIncludes(
    vendorId: string,
    includes: { item_id: string; quantity: number }[],
    packageId?: string,
  ) {
    if (includes.length === 0) return;
    const { data } = await this.admin
      .from('vendor_items')
      .select('id, kind')
      .eq('vendor_account_id', vendorId)
      .in(
        'id',
        includes.map((i) => i.item_id),
      );
    const found = new Map(((data ?? []) as any[]).map((r) => [r.id, r.kind]));
    for (const inc of includes) {
      if (!found.has(inc.item_id) || inc.item_id === packageId) {
        throw new BadRequestException(
          'A package can only include your own items.',
        );
      }
      if (found.get(inc.item_id) !== 'item') {
        throw new BadRequestException(
          'A package cannot include another package.',
        );
      }
    }
  }

  private async saveIncludes(
    packageId: string,
    includes: { item_id: string; quantity: number }[],
  ) {
    await this.admin
      .from('vendor_package_items')
      .delete()
      .eq('package_id', packageId);
    if (includes.length === 0) return;
    const { error } = await this.admin.from('vendor_package_items').insert(
      includes.map((i) => ({
        package_id: packageId,
        item_id: i.item_id,
        quantity: i.quantity,
      })),
    );
    if (error) throw new BadRequestException(error.message);
  }

  async create(userId: string, dto: Record<string, unknown>) {
    const vendorId = await this.vendorAccountId(userId);
    const fields = sanitizeCatalogItem(dto, 'create');
    const includes =
      fields.kind === 'package' ? sanitizeIncludes(dto.includes) : [];
    await this.checkIncludes(vendorId, includes);

    const { data, error } = await this.admin
      .from('vendor_items')
      .insert({
        kind: 'item',
        unit: 'each',
        price: 0,
        hide_price: false,
        is_active: true,
        sort_order: 0,
        ...fields,
        vendor_account_id: vendorId,
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new BadRequestException('We could not save the item. Try again.');
    }
    if (includes.length) await this.saveIncludes(data.id, includes);
    return (await this.withIncludes([data]))[0];
  }

  private async getOwned(vendorId: string, itemId: string) {
    const { data } = await this.admin
      .from('vendor_items')
      .select('*')
      .eq('id', itemId)
      .eq('vendor_account_id', vendorId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Item not found');
    return data;
  }

  async update(userId: string, itemId: string, dto: Record<string, unknown>) {
    const vendorId = await this.vendorAccountId(userId);
    const existing = await this.getOwned(vendorId, itemId);
    const fields = sanitizeCatalogItem(dto, 'update');
    const includes =
      existing.kind === 'package' && dto.includes !== undefined
        ? sanitizeIncludes(dto.includes)
        : null;
    if (includes) await this.checkIncludes(vendorId, includes, itemId);

    if (Object.keys(fields).length > 0) {
      const { error } = await this.admin
        .from('vendor_items')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) {
        throw new BadRequestException('We could not save the item. Try again.');
      }
    }
    if (includes) await this.saveIncludes(itemId, includes);
    return (
      await this.withIncludes([await this.getOwned(vendorId, itemId)])
    )[0];
  }

  async remove(userId: string, itemId: string) {
    const vendorId = await this.vendorAccountId(userId);
    await this.getOwned(vendorId, itemId);
    await this.admin.from('vendor_items').delete().eq('id', itemId);
    return { success: true };
  }

  async setVisibility(userId: string, showToClients: unknown) {
    if (typeof showToClients !== 'boolean') {
      throw new BadRequestException('show_to_clients must be true or false.');
    }
    const vendorId = await this.vendorAccountId(userId);
    await this.admin
      .from('vendor_accounts')
      .update({ show_catalog_to_clients: showToClients })
      .eq('id', vendorId);
    return { show_to_clients: showToClients };
  }

  // ─── Public (clients) ──────────────────────────────────────────────────────

  async getPublicByVendor(vendorId: string) {
    const { data: vendor } = await this.admin
      .from('vendor_accounts')
      .select('id, business_name, show_catalog_to_clients, is_active')
      .eq('id', vendorId)
      .maybeSingle();
    if (!vendor || !vendor.is_active || !vendor.show_catalog_to_clients) {
      // Same answer whether the vendor is unknown or simply has no public menu.
      return { enabled: false, vendor_id: vendorId, sections: [] as any[] };
    }

    const { data } = await this.admin
      .from('vendor_items')
      .select('*')
      .eq('vendor_account_id', vendorId)
      .eq('is_active', true);
    const items = await this.withIncludes(
      (data ?? []).sort(bySectionThenOrder),
    );

    const sections: { name: string | null; items: any[] }[] = [];
    for (const item of items) {
      let section = sections.find((s) => s.name === (item.section ?? null));
      if (!section) {
        section = { name: item.section ?? null, items: [] };
        sections.push(section);
      }
      section.items.push({
        id: item.id,
        name: item.name,
        description: item.description,
        kind: item.kind,
        unit: item.unit,
        unit_label: UNIT_SUFFIX[item.unit as CatalogUnit] ?? '',
        price: item.hide_price ? null : item.price,
        image_url: item.image_url,
        includes: (item.includes as IncludedItem[]).map((i) => ({
          name: i.name,
          quantity: i.quantity,
        })),
      });
    }
    return {
      enabled: sections.length > 0,
      vendor_id: vendorId,
      sections,
    };
  }

  async getPublicBySlug(slug: string) {
    const { data: link } = await this.admin
      .from('vendor_booking_links')
      .select('vendor_account_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (!link) throw new NotFoundException('Booking link not found');
    return this.getPublicByVendor(link.vendor_account_id as string);
  }

  /**
   * Turns the picks a client sent into a snapshot stored on the booking request.
   * Every pick is checked against the vendor's real, active, client-visible catalog.
   */
  async snapshotRequestedItems(
    vendorAccountId: string,
    input: unknown,
  ): Promise<RequestedItem[]> {
    const picks = sanitizeRequestedInput(input);
    if (picks.length === 0) return [];

    const { data: vendor } = await this.admin
      .from('vendor_accounts')
      .select('show_catalog_to_clients')
      .eq('id', vendorAccountId)
      .maybeSingle();
    if (!vendor?.show_catalog_to_clients) {
      throw new BadRequestException(
        'This vendor is not taking item selections right now.',
      );
    }

    const { data } = await this.admin
      .from('vendor_items')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .eq('is_active', true)
      .in(
        'id',
        picks.map((p) => p.item_id),
      );
    const rows = await this.withIncludes(data ?? []);
    const byId = new Map(rows.map((r) => [r.id as string, r]));

    return picks.map((pick) => {
      const item = byId.get(pick.item_id);
      if (!item) {
        throw new BadRequestException(
          'One of the selected items is no longer available. Refresh and try again.',
        );
      }
      return {
        item_id: item.id,
        name: item.name,
        kind: item.kind,
        unit: item.unit,
        quantity: pick.quantity,
        unit_price: item.hide_price ? null : Number(item.price),
        description: item.description ?? null,
        includes: (item.includes as IncludedItem[]).map((i) => ({
          name: i.name,
          quantity: i.quantity,
        })),
      };
    });
  }
}
