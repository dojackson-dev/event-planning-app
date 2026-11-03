import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/** Old short links: /b/<code> vendors, /a/<code> artists, /p/<code> promoters, /v/<code> venues. */
const KINDS: Record<string, { table: string; page: string }> = {
  b: { table: 'vendor_booking_links', page: '/book/' },
  a: { table: 'artist_booking_links', page: '/book-artist/' },
  p: { table: 'promoter_booking_links', page: '/book-promoter/' },
  v: { table: 'owner_booking_links', page: '/book-venue/' },
};

@Injectable()
export class ShortLinksService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** Resolves a short code to the booking page path it points at, or 404 when it is unknown or switched off. */
  async resolve(kind: string, code: string): Promise<{ path: string }> {
    const target = KINDS[kind];
    if (!target || !/^[a-z0-9]{4,12}$/i.test(code)) {
      throw new NotFoundException('Booking link not found');
    }
    const { data } = await this.supabaseService
      .getAdminClient()
      .from(target.table)
      .select('slug')
      .eq('short_code', code.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();
    if (!data?.slug) throw new NotFoundException('Booking link not found');
    return { path: `${target.page}${encodeURIComponent(data.slug)}` };
  }
}
