import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { isOwnGalleryUrl, MAX_LISTING_PHOTOS, mergePhotos } from './photos';

export interface PhotoSubject {
  id: string | number;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
}

export interface ListingPhoto {
  id: string;
  url: string;
}

type PhotoTable = 'vendor_gallery' | 'venue_photos';

const OWNER_COLUMN: Record<PhotoTable, string> = {
  vendor_gallery: 'vendor_account_id',
  venue_photos: 'venue_id',
};

@Injectable()
export class ListingPhotosService {
  private readonly logger = new Logger(ListingPhotosService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── public listings ───────────────────────────────────────────

  /** Adds `photos` (up to 5 image URLs, or [] for the placeholder) to each vendor and venue in a listing. */
  async attachPhotos<V extends PhotoSubject, N extends PhotoSubject>(result: {
    vendors: V[];
    venues: N[];
  }): Promise<{
    vendors: Array<V & { photos: string[] }>;
    venues: Array<N & { photos: string[] }>;
  }> {
    const [vendorUploads, venueUploads] = await Promise.all([
      this.uploadedFor(
        'vendor_gallery',
        result.vendors.map((v) => v.id),
      ),
      this.uploadedFor(
        'venue_photos',
        result.venues.map((v) => v.id),
      ),
    ]);
    return {
      vendors: result.vendors.map((v) => ({
        ...v,
        photos: mergePhotos(
          vendorUploads.get(String(v.id)) ?? [],
          [v.cover_image_url],
          v.profile_image_url,
        ),
      })),
      venues: result.venues.map((v) => ({
        ...v,
        photos: mergePhotos(
          venueUploads.get(String(v.id)) ?? [],
          [v.cover_image_url],
          v.profile_image_url,
        ),
      })),
    };
  }

  private async uploadedFor(
    table: PhotoTable,
    ids: Array<string | number>,
  ): Promise<Map<string, string[]>> {
    const byOwner = new Map<string, string[]>();
    if (ids.length === 0) return byOwner;
    const column = OWNER_COLUMN[table];
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from(table)
      .select(`${column}, image_url`)
      .in(column, ids.map(String))
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      // A missing table (migration not run yet) must not break the whole listing.
      this.logger.warn(`Could not read ${table}: ${error.message}`);
      return byOwner;
    }
    for (const row of (data ?? []) as unknown as Array<
      Record<string, string>
    >) {
      const key = String(row[column]);
      byOwner.set(key, [...(byOwner.get(key) ?? []), row.image_url]);
    }
    return byOwner;
  }

  // ── vendor photo management ───────────────────────────────────

  async listVendorPhotos(userId: string): Promise<ListingPhoto[]> {
    return this.list('vendor_gallery', await this.vendorAccountId(userId));
  }

  async addVendorPhoto(userId: string, url: unknown): Promise<ListingPhoto[]> {
    return this.add('vendor_gallery', await this.vendorAccountId(userId), url);
  }

  async deleteVendorPhoto(
    userId: string,
    photoId: string,
  ): Promise<ListingPhoto[]> {
    return this.remove(
      'vendor_gallery',
      await this.vendorAccountId(userId),
      photoId,
    );
  }

  // ── venue photo management ────────────────────────────────────

  async listVenuePhotos(userId: string, venueId: string) {
    await this.assertVenueAccess(userId, venueId);
    return this.list('venue_photos', venueId);
  }

  async addVenuePhoto(userId: string, venueId: string, url: unknown) {
    await this.assertVenueAccess(userId, venueId);
    return this.add('venue_photos', venueId, url);
  }

  async deleteVenuePhoto(userId: string, venueId: string, photoId: string) {
    await this.assertVenueAccess(userId, venueId);
    return this.remove('venue_photos', venueId, photoId);
  }

  // ── internals ─────────────────────────────────────────────────

  private async vendorAccountId(userId: string): Promise<string> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data?.id) throw new NotFoundException('Vendor account not found');
    return String(data.id);
  }

  /** The user must belong to the owner account that owns the venue. */
  private async assertVenueAccess(
    userId: string,
    venueId: string,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .not('owner_account_id', 'is', null)
      .limit(1)
      .maybeSingle();
    let ownerAccountId = membership?.owner_account_id ?? null;
    if (ownerAccountId == null) {
      const { data: owner } = await admin
        .from('owner_accounts')
        .select('id')
        .eq('primary_owner_id', userId)
        .maybeSingle();
      ownerAccountId = owner?.id ?? null;
    }
    if (ownerAccountId == null) throw new NotFoundException('Venue not found');

    const { data: venue } = await admin
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('owner_account_id', ownerAccountId)
      .maybeSingle();
    if (!venue) throw new NotFoundException('Venue not found');
  }

  private async list(
    table: PhotoTable,
    ownerId: string,
  ): Promise<ListingPhoto[]> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from(table)
      .select('id, image_url')
      .eq(OWNER_COLUMN[table], ownerId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map((r: { id: string; image_url: string }) => ({
      id: String(r.id),
      url: r.image_url,
    }));
  }

  private async add(
    table: PhotoTable,
    ownerId: string,
    url: unknown,
  ): Promise<ListingPhoto[]> {
    if (!isOwnGalleryUrl(url, this.config.get<string>('SUPABASE_URL'))) {
      throw new BadRequestException('Upload the photo first, then add it.');
    }
    const existing = await this.list(table, ownerId);
    if (existing.length >= MAX_LISTING_PHOTOS) {
      throw new BadRequestException(
        `You can show up to ${MAX_LISTING_PHOTOS} photos. Remove one to add another.`,
      );
    }
    const { error } = await this.supabaseService
      .getAdminClient()
      .from(table)
      .insert({
        [OWNER_COLUMN[table]]: ownerId,
        image_url: url,
        display_order: existing.length,
      });
    if (error) throw new BadRequestException(error.message);
    return this.list(table, ownerId);
  }

  private async remove(
    table: PhotoTable,
    ownerId: string,
    photoId: string,
  ): Promise<ListingPhoto[]> {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from(table)
      .delete()
      .eq('id', photoId)
      .eq(OWNER_COLUMN[table], ownerId);
    if (error) throw new BadRequestException(error.message);
    return this.list(table, ownerId);
  }
}
