import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorSearchDto,
  CreateVendorBookingDto,
  UpdateVendorBookingDto,
  CreateVendorReviewDto,
} from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

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
      .neq('is_active', false)
      .order('business_name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    return (data || []).map(v => this.enrichWithRating(v));
  }

  // ─────────────────────────────────────────────
  // VENDOR BOOKINGS
  // ─────────────────────────────────────────────

  async createVendorBooking(bookedByUserId: string, dto: CreateVendorBookingDto, ownerAccountId?: string) {
    const admin = this.supabaseService.getAdminClient();

    // Verify vendor exists
    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('id, business_name')
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
}
