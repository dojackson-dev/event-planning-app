import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { grossUp } from '../promoter-events/promoter-events.service';
import { NonprofitService } from './nonprofit.service';

export class SponsorshipLevelDto {
  name?: string;
  description?: string | null;
  price?: number;
  fairMarketValue?: number;
  quantityAvailable?: number | null;
  tablesIncluded?: number;
  seatsPerTable?: number;
  ticketsIncluded?: number;
  benefits?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

interface LevelRow {
  id: string;
  public_event_id: string;
  quantity_sold: number;
  price: number;
}

const COLUMNS =
  'id, public_event_id, name, description, price, fair_market_value, quantity_available, quantity_sold, tables_included, seats_per_table, tickets_included, benefits, sort_order, is_active, created_at';

function intIn(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  ) {
    throw new BadRequestException(
      `${label} must be a whole number from ${min} to ${max}.`,
    );
  }
  return value as number;
}

function money(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1_000_000
  ) {
    throw new BadRequestException(`${label} must be between 0 and 1,000,000.`);
  }
  return Math.round(value * 100) / 100;
}

@Injectable()
export class SponsorshipService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly nonprofit: NonprofitService,
  ) {}

  /** Builds the DB patch from a DTO, validating only the fields provided. */
  private toPatch(dto: SponsorshipLevelDto, full: boolean) {
    const patch: Record<string, unknown> = {};
    if (full || dto.name !== undefined) {
      const name = (dto.name ?? '').trim();
      if (!name || name.length > 100) {
        throw new BadRequestException('Name is required (max 100 characters).');
      }
      patch.name = name;
    }
    if (dto.description !== undefined) {
      patch.description = dto.description?.trim().slice(0, 1000) || null;
    }
    if (full || dto.price !== undefined)
      patch.price = money(dto.price, 'Price');
    if (dto.fairMarketValue !== undefined) {
      patch.fair_market_value = money(dto.fairMarketValue, 'Fair market value');
    }
    if (dto.quantityAvailable !== undefined) {
      patch.quantity_available =
        dto.quantityAvailable === null
          ? null
          : intIn(dto.quantityAvailable, 'Quantity available', 1, 100_000);
    }
    if (dto.tablesIncluded !== undefined) {
      patch.tables_included = intIn(
        dto.tablesIncluded,
        'Tables included',
        0,
        100,
      );
    }
    if (dto.seatsPerTable !== undefined) {
      patch.seats_per_table = intIn(
        dto.seatsPerTable,
        'Seats per table',
        0,
        50,
      );
    }
    if (dto.ticketsIncluded !== undefined) {
      patch.tickets_included = intIn(
        dto.ticketsIncluded,
        'Tickets included',
        0,
        1000,
      );
    }
    if (dto.benefits !== undefined) {
      if (
        !Array.isArray(dto.benefits) ||
        dto.benefits.length > 20 ||
        dto.benefits.some((b) => typeof b !== 'string' || b.length > 200)
      ) {
        throw new BadRequestException(
          'Benefits must be up to 20 short text items.',
        );
      }
      patch.benefits = dto.benefits.map((b) => b.trim()).filter(Boolean);
    }
    if (dto.sortOrder !== undefined) {
      patch.sort_order = intIn(dto.sortOrder, 'Sort order', 0, 10_000);
    }
    if (dto.isActive !== undefined) patch.is_active = Boolean(dto.isActive);
    return patch;
  }

  private assertConsistent(
    patch: Record<string, unknown>,
    current?: Record<string, unknown>,
  ) {
    const get = (k: string) => (k in patch ? patch[k] : current?.[k]);
    const price = Number(get('price') ?? 0);
    const fmv = Number(get('fair_market_value') ?? 0);
    if (fmv > price) {
      throw new BadRequestException(
        'Fair market value cannot exceed the price.',
      );
    }
    if (
      Number(get('tables_included') ?? 0) > 0 &&
      Number(get('seats_per_table') ?? 0) < 1
    ) {
      throw new BadRequestException(
        'Set seats per table when including tables.',
      );
    }
  }

  /** The event must belong to this (verified) promoter. */
  private async assertOwnsEvent(promoterId: string, eventId: string) {
    const { data } = await this.supabase
      .getAdminClient()
      .from('public_events')
      .select('id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoterId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Event not found');
  }

  private async getOwnedLevel(promoterId: string, levelId: string) {
    const admin = this.supabase.getAdminClient();
    const { data: level } = await admin
      .from('sponsorship_levels')
      .select(`${COLUMNS}`)
      .eq('id', levelId)
      .maybeSingle();
    if (!level) throw new NotFoundException('Sponsorship level not found');
    await this.assertOwnsEvent(
      promoterId,
      (level as unknown as LevelRow).public_event_id,
    );
    return level as unknown as LevelRow & Record<string, unknown>;
  }

  async list(userId: string, eventId: string) {
    const promoterId = await this.nonprofit.assertVerified(userId);
    await this.assertOwnsEvent(promoterId, eventId);
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('sponsorship_levels')
      .select(COLUMNS)
      .eq('public_event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('price', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async create(userId: string, eventId: string, dto: SponsorshipLevelDto) {
    const promoterId = await this.nonprofit.assertVerified(userId);
    await this.assertOwnsEvent(promoterId, eventId);
    const patch = this.toPatch(dto, true);
    this.assertConsistent(patch);
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('sponsorship_levels')
      .insert({ ...patch, public_event_id: eventId })
      .select(COLUMNS)
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(userId: string, levelId: string, dto: SponsorshipLevelDto) {
    const promoterId = await this.nonprofit.assertVerified(userId);
    const current = await this.getOwnedLevel(promoterId, levelId);
    const patch = this.toPatch(dto, false);
    this.assertConsistent(patch, current);
    if (
      'quantity_available' in patch &&
      patch.quantity_available !== null &&
      (patch.quantity_available as number) < current.quantity_sold
    ) {
      throw new BadRequestException(
        'Quantity available cannot be lower than the number already sold.',
      );
    }
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('sponsorship_levels')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', levelId)
      .select(COLUMNS)
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /** A level that has sold is deactivated instead of deleted, to keep records. */
  async remove(userId: string, levelId: string) {
    const promoterId = await this.nonprofit.assertVerified(userId);
    const level = await this.getOwnedLevel(promoterId, levelId);
    const admin = this.supabase.getAdminClient();
    if (level.quantity_sold > 0) {
      await admin
        .from('sponsorship_levels')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', levelId);
      return { deleted: false, deactivated: true };
    }
    const { error } = await admin
      .from('sponsorship_levels')
      .delete()
      .eq('id', levelId);
    if (error) throw new BadRequestException(error.message);
    return { deleted: true, deactivated: false };
  }

  /** Public: active levels for a published event (no auth). */
  async listPublic(eventId: string) {
    const admin = this.supabase.getAdminClient();
    const { data: event } = await admin
      .from('public_events')
      .select('id, status, promoter_account_id')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();
    if (!event) throw new NotFoundException('Event not found');

    // Hide the offer entirely unless buyers can actually pay.
    const { data: promoter } = await admin
      .from('promoter_accounts')
      .select(
        'is_nonprofit, nonprofit_status, stripe_account_id, stripe_connect_status',
      )
      .eq('id', event.promoter_account_id)
      .maybeSingle();
    if (
      !promoter?.is_nonprofit ||
      promoter.nonprofit_status !== 'verified' ||
      !promoter.stripe_account_id ||
      promoter.stripe_connect_status !== 'active'
    ) {
      return [];
    }

    const { data, error } = await admin
      .from('sponsorship_levels')
      .select(COLUMNS)
      .eq('public_event_id', eventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('price', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    // Buyers pay the processing + platform fee on top of the price.
    return (data ?? []).map((l) => {
      const priceCents = Math.round(Number(l.price) * 100);
      const totalCents = priceCents > 0 ? grossUp(priceCents) : 0;
      return {
        ...l,
        service_fee: (totalCents - priceCents) / 100,
        buyer_total: totalCents / 100,
        remaining:
          l.quantity_available === null
            ? null
            : Math.max(l.quantity_available - l.quantity_sold, 0),
      };
    });
  }
}
