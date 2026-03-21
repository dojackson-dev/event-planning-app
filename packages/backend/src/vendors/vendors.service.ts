import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../messaging/twilio.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorSearchDto,
  CreateVendorBookingDto,
  UpdateVendorBookingDto,
  CreateVendorReviewDto,
  UpsertBookingLinkDto,
  SubmitBookingRequestDto,
  UpdateBookingRequestDto,
} from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly twilioService: TwilioService,
  ) {}

  // ─────────────────────────────────────────────
  // VENDOR ACCOUNT
  // ─────────────────────────────────────────────

  async createVendorAccount(userId: string, dto: CreateVendorDto) {
    const admin = this.supabaseService.getAdminClient();

    // Check for existing vendor account
    const { data: existing } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new BadRequestException('Vendor account already exists for this user');
    }

    const { data, error } = await admin
      .from('vendor_accounts')
      .insert({
        user_id: userId,
        business_name: dto.businessName,
        category: dto.category,
        bio: dto.bio,
        website: dto.website,
        instagram: dto.instagram,
        facebook: dto.facebook,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip_code: dto.zipCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        hourly_rate: dto.hourlyRate,
        flat_rate: dto.flatRate,
        rate_description: dto.rateDescription,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update user role to vendor
    await admin
      .from('users')
      .update({ role: 'vendor' })
      .eq('id', userId);

    this.logger.log(`Vendor account created for user ${userId}: ${dto.businessName}`);
    return data;
  }

  async getVendorByUserId(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_accounts')
      .select('*, vendor_reviews(rating)')
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Vendor account not found');
    return this.enrichWithRating(data);
  }

  async getVendorById(vendorId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_accounts')
      .select('*, vendor_reviews(id, rating, review_text, created_at, reviewer_user_id), vendor_gallery(id, image_url, caption, display_order)')
      .eq('id', vendorId)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new NotFoundException('Vendor not found');
    return this.enrichWithRating(data);
  }

  async updateVendorAccount(userId: string, dto: UpdateVendorDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!vendor) throw new NotFoundException('Vendor account not found');

    const updatePayload: Record<string, any> = {};
    if (dto.businessName !== undefined) updatePayload.business_name = dto.businessName;
    if (dto.category !== undefined) updatePayload.category = dto.category;
    if (dto.bio !== undefined) updatePayload.bio = dto.bio;
    if (dto.website !== undefined) updatePayload.website = dto.website;
    if (dto.instagram !== undefined) updatePayload.instagram = dto.instagram;
    if (dto.facebook !== undefined) updatePayload.facebook = dto.facebook;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone;
    if (dto.email !== undefined) updatePayload.email = dto.email;
    if (dto.address !== undefined) updatePayload.address = dto.address;
    if (dto.city !== undefined) updatePayload.city = dto.city;
    if (dto.state !== undefined) updatePayload.state = dto.state;
    if (dto.zipCode !== undefined) updatePayload.zip_code = dto.zipCode;
    if (dto.latitude !== undefined) updatePayload.latitude = dto.latitude;
    if (dto.longitude !== undefined) updatePayload.longitude = dto.longitude;
    if (dto.hourlyRate !== undefined) updatePayload.hourly_rate = dto.hourlyRate;
    if (dto.flatRate !== undefined) updatePayload.flat_rate = dto.flatRate;
    if (dto.rateDescription !== undefined) updatePayload.rate_description = dto.rateDescription;
    if (dto.profileImageUrl !== undefined) updatePayload.profile_image_url = dto.profileImageUrl;
    if (dto.coverImageUrl !== undefined) updatePayload.cover_image_url = dto.coverImageUrl;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from('vendor_accounts')
      .update(updatePayload)
      .eq('id', vendor.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─────────────────────────────────────────────
  // VENDOR SEARCH
  // ─────────────────────────────────────────────

  async searchVendors(searchDto: VendorSearchDto) {
    const admin = this.supabaseService.getAdminClient();
    const radius = searchDto.radiusMiles || 30;

    // Use the geo search function
    const { data: vendors, error } = await admin.rpc('search_vendors_by_location', {
      search_lat: searchDto.lat,
      search_lng: searchDto.lng,
      radius_miles: radius,
      filter_category: searchDto.category || null,
    });

    if (error) {
      this.logger.error('Vendor geo search error:', error);
      throw new BadRequestException('Search failed: ' + error.message);
    }

    return vendors || [];
  }

  async searchVenuesByLocation(lat: number, lng: number, radiusMiles = 30) {
    const admin = this.supabaseService.getAdminClient();

    const { data: venues, error } = await admin.rpc('search_venues_by_location', {
      search_lat: lat,
      search_lng: lng,
      radius_miles: radiusMiles,
    });

    if (error) {
      this.logger.error('Venue geo search error:', error);
      throw new BadRequestException('Venue search failed: ' + error.message);
    }

    return venues || [];
  }

  async getAllVendors(category?: string) {
    const admin = this.supabaseService.getAdminClient();
    let query = admin
      .from('vendor_accounts')
      .select('id, business_name, category, bio, city, state, zip_code, profile_image_url, hourly_rate, flat_rate, rate_description, phone, email, website, instagram, facebook, is_verified, vendor_reviews(rating)')
      .or('is_active.is.null,is_active.eq.true')
      .order('business_name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    return (data || []).map(v => this.enrichWithRating(v));
  }

  async getAllVenues() {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('venues')
      .select('id, name, address, city, state, zip_code, capacity, description, profile_image_url, website, phone, email')
      .or('is_active.is.null,is_active.eq.true')
      .not('name', 'is', null)
      .order('name');

    if (error) {
      this.logger.error('getAllVenues error:', error.message);
      return [];
    }
    return data || [];
  }

  // ─────────────────────────────────────────────
  // VENDOR BOOKINGS
  // ─────────────────────────────────────────────

  async createVendorBooking(bookedByUserId: string, dto: CreateVendorBookingDto, ownerAccountId?: string) {
    const admin = this.supabaseService.getAdminClient();

    // Verify vendor exists (include phone for SMS)
    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('id, business_name, phone')
      .eq('id', dto.vendorAccountId)
      .eq('is_active', true)
      .single();

    if (!vendor) throw new NotFoundException('Vendor not found');

    const { data, error } = await admin
      .from('vendor_bookings')
      .insert({
        vendor_account_id: dto.vendorAccountId,
        owner_account_id: ownerAccountId || null,
        booked_by_user_id: bookedByUserId,
        event_id: dto.eventId || null,
        event_name: dto.eventName,
        event_date: dto.eventDate,
        start_time: dto.startTime || null,
        end_time: dto.endTime || null,
        venue_name: dto.venueName || null,
        venue_address: dto.venueAddress || null,
        notes: dto.notes || null,
        agreed_amount: dto.agreedAmount || null,
        deposit_amount: dto.depositAmount || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Vendor booking created: vendor ${dto.vendorAccountId} by user ${bookedByUserId}`);

    // Send SMS notification to vendor if they have a phone number
    if (vendor.phone) {
      const dateStr = new Date(dto.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
      const amountStr = dto.agreedAmount ? ` — Agreed amount: $${Number(dto.agreedAmount).toLocaleString()}` : '';
      const smsBody = `New booking request for ${vendor.business_name}! Event: "${dto.eventName}" on ${dateStr}${amountStr}. Log in to your vendor dashboard to confirm or decline.`;
      try {
        await this.twilioService.sendSMS(vendor.phone, smsBody);
        this.logger.log(`SMS sent to vendor ${vendor.business_name} at ${vendor.phone}`);
      } catch (smsErr) {
        // Don't fail the booking if SMS fails
        this.logger.warn(`Failed to send SMS to vendor ${vendor.business_name}: ${smsErr.message}`);
      }
    }

    return data;
  }

  async getVendorBookings(vendorUserId: string, status?: string) {
    const admin = this.supabaseService.getAdminClient();

    // Get vendor account id
    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', vendorUserId)
      .single();

    if (!vendor) throw new NotFoundException('Vendor account not found');

    let query = admin
      .from('vendor_bookings')
      .select('*')
      .eq('vendor_account_id', vendor.id)
      .order('event_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getOwnerVendorBookings(ownerAccountId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('vendor_bookings')
      .select('*, vendor_accounts(id, business_name, category, profile_image_url, phone, email)')
      .eq('owner_account_id', ownerAccountId)
      .order('event_date', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getVendorBookingById(bookingId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_bookings')
      .select('*, vendor_accounts(id, business_name, category, profile_image_url, hourly_rate, flat_rate, phone, email)')
      .eq('id', bookingId)
      .single();

    if (error || !data) throw new NotFoundException('Vendor booking not found');
    return data;
  }

  async getOwnerVendorBookingsByEvent(eventId: string, ownerAccountId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_bookings')
      .select('*, vendor_accounts(id, business_name, category, profile_image_url)')
      .eq('event_id', eventId)
      .eq('owner_account_id', ownerAccountId)
      .order('event_date', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateVendorBooking(bookingId: string, userId: string, dto: UpdateVendorBookingDto) {
    const admin = this.supabaseService.getAdminClient();

    // Verify the user owns the vendor account for this booking (or booked it)
    const { data: booking } = await admin
      .from('vendor_bookings')
      .select('*, vendor_accounts(user_id)')
      .eq('id', bookingId)
      .single();

    if (!booking) throw new NotFoundException('Booking not found');

    const isVendor = (booking.vendor_accounts as any)?.user_id === userId;
    const isBooker = booking.booked_by_user_id === userId;

    if (!isVendor && !isBooker) {
      throw new BadRequestException('Not authorized to update this booking');
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.agreedAmount !== undefined) updatePayload.agreed_amount = dto.agreedAmount;
    if (dto.depositAmount !== undefined) updatePayload.deposit_amount = dto.depositAmount;

    const { data, error } = await admin
      .from('vendor_bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─────────────────────────────────────────────
  // VENDOR REVIEWS
  // ─────────────────────────────────────────────

  async createReview(userId: string, dto: CreateVendorReviewDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('vendor_reviews')
      .insert({
        vendor_account_id: dto.vendorAccountId,
        reviewer_user_id: userId,
        vendor_booking_id: dto.vendorBookingId || null,
        rating: dto.rating,
        review_text: dto.reviewText || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getVendorReviews(vendorId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_reviews')
      .select('*')
      .eq('vendor_account_id', vendorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ─────────────────────────────────────────────
  // CATEGORIES LISTING
  // ─────────────────────────────────────────────

  getCategories() {
    return [
      { value: 'dj', label: 'DJ' },
      { value: 'decorator', label: 'Decorator' },
      { value: 'planner_coordinator', label: 'Planner / Coordinator' },
      { value: 'furniture', label: 'Furniture' },
      { value: 'photographer', label: 'Photographer' },
      { value: 'musicians', label: 'Musicians' },
      { value: 'mc_host', label: 'MC / Host' },
      { value: 'other', label: 'Other' },
    ];
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private enrichWithRating(vendor: any) {
    const reviews = vendor.vendor_reviews || [];
    const ratings = reviews.map((r: any) => r.rating).filter(Boolean);
    const avg = ratings.length
      ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    const { vendor_reviews, ...rest } = vendor;
    return {
      ...rest,
      avgRating: avg,
      reviewCount: ratings.length,
    };
  }

  // Geocode zip code to lat/lng using public API (no key required)
  async geocodeZip(zipCode: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`,
        { headers: { 'User-Agent': 'DoVenueSuite/1.0' } }
      );
      const data = await response.json() as any[];
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      this.logger.warn('Geocoding failed for zip:', zipCode);
    }
    return null;
  }

  // Reverse geocode lat/lng to address components
  async reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string; zip: string; displayName: string } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'DoVenueSuite/1.0' } }
      );
      const data = await response.json() as any;
      if (!data?.address) return null;
      const addr = data.address;
      return {
        city: addr.city || addr.town || addr.village || addr.county || '',
        state: addr.state || '',
        zip: addr.postcode || '',
        displayName: data.display_name || '',
      };
    } catch (err) {
      this.logger.warn('Reverse geocoding failed for coords:', lat, lng);
    }
    return null;
  }

  // Address autocomplete — returns up to 5 US address suggestions
  async geocodeAutocomplete(query: string): Promise<Array<{ displayName: string; city: string; state: string; zip: string; lat: number; lng: number }>> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=5&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'DoVenueSuite/1.0' } });
      const data = await response.json() as any[];
      if (!Array.isArray(data)) return [];
      return data.map(item => {
        const addr = item.address || {};
        return {
          displayName: item.display_name,
          city: addr.city || addr.town || addr.village || addr.county || '',
          state: addr.state || '',
          zip: addr.postcode || '',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      });
    } catch (err) {
      this.logger.warn('Address autocomplete failed for query:', query);
    }
    return [];
  }

  // ─────────────────────────────────────────────
  // BOOKING LINKS
  // ─────────────────────────────────────────────

  private async getVendorAccountIdByUserId(userId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new BadRequestException('No vendor account found for this user');
    return data.id;
  }

  /** Create or update the vendor's booking link (one per vendor). */
  async upsertBookingLink(userId: string, dto: UpsertBookingLinkDto) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountIdByUserId(userId);

    // Validate slug — alphanumeric and hyphens only
    if (!/^[a-z0-9-]{3,60}$/.test(dto.slug)) {
      throw new BadRequestException('Slug must be 3-60 characters: lowercase letters, numbers, and hyphens only');
    }

    // Check slug uniqueness (exclude own if updating)
    const { data: conflict } = await admin
      .from('vendor_booking_links')
      .select('id, vendor_account_id')
      .eq('slug', dto.slug)
      .maybeSingle();

    if (conflict && conflict.vendor_account_id !== vendorAccountId) {
      throw new BadRequestException('This booking link slug is already taken');
    }

    const payload = {
      vendor_account_id: vendorAccountId,
      slug: dto.slug,
      is_active: dto.isActive ?? true,
      custom_message: dto.customMessage ?? null,
      default_deposit_percentage: dto.defaultDepositPercentage ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await admin
      .from('vendor_booking_links')
      .select('id')
      .eq('vendor_account_id', vendorAccountId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await admin
        .from('vendor_booking_links')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    } else {
      const { data, error } = await admin
        .from('vendor_booking_links')
        .insert(payload)
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    }
  }

  /** Get the vendor's own booking link. */
  async getMyBookingLink(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountIdByUserId(userId);

    const { data } = await admin
      .from('vendor_booking_links')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .maybeSingle();

    return data ?? null;
  }

  /** Public: get booking link info by slug (no auth). */
  async getPublicBookingLink(slug: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vendor_booking_links')
      .select('*, vendor_accounts(business_name, category, city, state, bio, profile_image_url, hourly_rate, flat_rate, rate_description)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new NotFoundException('Booking link not found or inactive');
    return data;
  }

  /** Public: submit a booking request via a booking link. */
  async submitBookingRequest(slug: string, dto: SubmitBookingRequestDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data: link } = await admin
      .from('vendor_booking_links')
      .select('id, vendor_account_id, vendor_accounts(phone)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!link) throw new NotFoundException('Booking link not found or inactive');

    const { data: request, error } = await admin
      .from('vendor_booking_requests')
      .insert({
        vendor_account_id: link.vendor_account_id,
        booking_link_id: link.id,
        client_name: dto.clientName,
        client_email: dto.clientEmail,
        client_phone: dto.clientPhone ?? null,
        event_name: dto.eventName ?? null,
        event_date: dto.eventDate ?? null,
        start_time: dto.startTime ?? null,
        end_time: dto.endTime ?? null,
        venue_name: dto.venueName ?? null,
        venue_address: dto.venueAddress ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Notify vendor via SMS if they have a phone number
    const vendorPhone = (link.vendor_accounts as any)?.phone;
    if (vendorPhone) {
      try {
        await this.twilioService.sendSms(
          vendorPhone,
          `New booking request from ${dto.clientName}${dto.eventName ? ` for "${dto.eventName}"` : ''}${dto.eventDate ? ` on ${dto.eventDate}` : ''}. Log in to your vendor portal to respond.`,
        );
      } catch (err) {
        this.logger.warn('Failed to send SMS for booking request', (err as Error).message);
      }
    }

    return request;
  }

  /** Get all booking requests for the authenticated vendor. */
  async getMyBookingRequests(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountIdByUserId(userId);

    const { data, error } = await admin
      .from('vendor_booking_requests')
      .select('*')
      .eq('vendor_account_id', vendorAccountId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  /** Update a booking request status (confirm / decline). */
  async updateBookingRequest(userId: string, requestId: string, dto: UpdateBookingRequestDto) {
    const admin = this.supabaseService.getAdminClient();
    const vendorAccountId = await this.getVendorAccountIdByUserId(userId);

    const { data: existing } = await admin
      .from('vendor_booking_requests')
      .select('id')
      .eq('id', requestId)
      .eq('vendor_account_id', vendorAccountId)
      .single();

    if (!existing) throw new NotFoundException('Booking request not found');

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.status) update.status = dto.status;
    if (dto.quotedAmount !== undefined) update.quoted_amount = dto.quotedAmount;
    if (dto.notes !== undefined) update.notes = dto.notes;

    const { data, error } = await admin
      .from('vendor_booking_requests')
      .update(update)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
