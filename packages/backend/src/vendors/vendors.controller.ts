import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  CreateVendorBookingDto,
  UpdateVendorBookingDto,
  CreateVendorReviewDto,
} from './dto/vendor.dto';

@Controller('vendors')
export class VendorsController {
  private readonly logger = new Logger(VendorsController.name);

  constructor(
    private readonly vendorsService: VendorsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ─────────────────────────────────────────────
  // AUTH HELPERS
  // ─────────────────────────────────────────────

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (token.startsWith('local-')) {
      return token.replace('local-', '');
    }

    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  private async getOwnerAccountId(userId: string): Promise<string | null> {
    const admin = this.supabaseService.getAdminClient();

    // Primary: memberships table (normal registration path)
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (membership?.owner_account_id) return membership.owner_account_id;

    // Fallback: owner may have been set up via script — check primary_owner_id
    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('id')
      .eq('primary_owner_id', userId)
      .single();

    return ownerAccount?.id || null;
  }

  // ─────────────────────────────────────────────
  // PUBLIC ROUTES (no auth required)
  // ─────────────────────────────────────────────

  /** GET /vendors/categories */
  @Get('categories')
  getCategories() {
    return this.vendorsService.getCategories();
  }

  /**
   * GET /vendors/search?lat=&lng=&radiusMiles=&category=
   * Search vendors by geo location
   */
  @Get('search')
  async searchVendors(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusMiles') radiusMiles: string,
    @Query('category') category: string,
    @Query('zipCode') zipCode: string,
  ) {
    let searchLat = lat ? parseFloat(lat) : null;
    let searchLng = lng ? parseFloat(lng) : null;

    // If zip code provided but no lat/lng, geocode it
    if (zipCode && (!searchLat || !searchLng)) {
      const coords = await this.vendorsService.geocodeZip(zipCode);
      if (coords) {
        searchLat = coords.lat;
        searchLng = coords.lng;
      }
    }

    if (!searchLat || !searchLng) {
      // Fallback: return all vendors + venues without geo filter
      const [vendors, venues] = await Promise.all([
        this.vendorsService.getAllVendors(category),
        this.vendorsService.getAllVenues(),
      ]);
      return { vendors, venues };
    }

    const vendors = await this.vendorsService.searchVendors({
      lat: searchLat,
      lng: searchLng,
      radiusMiles: radiusMiles ? parseInt(radiusMiles) : 30,
      category: category as any,
    });

    // Also get venues in same radius
    const venues = await this.vendorsService.searchVenuesByLocation(
      searchLat,
      searchLng,
      radiusMiles ? parseInt(radiusMiles) : 30,
    );

    return { vendors, venues };
  }

  /** GET /vendors/public - list all active vendors + venues (no location filter) */
  @Get('public')
  async getAllVendors(@Query('category') category: string) {
    const [vendors, venues] = await Promise.all([
      this.vendorsService.getAllVendors(category),
      this.vendorsService.getAllVenues(),
    ]);
    return { vendors, venues };
  }

  /** GET /vendors/:id - public vendor profile */
  @Get(':id')
  async getVendor(@Param('id') vendorId: string) {
    return this.vendorsService.getVendorById(vendorId);
  }

  /** GET /vendors/:id/reviews */
  @Get(':id/reviews')
  async getVendorReviews(@Param('id') vendorId: string) {
    return this.vendorsService.getVendorReviews(vendorId);
  }

  // ─────────────────────────────────────────────
  // AUTHENTICATED VENDOR ROUTES
  // ─────────────────────────────────────────────

  /** POST /vendors/account - create vendor account (registration) */
  @Post('account')
  async createVendorAccount(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateVendorDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.vendorsService.createVendorAccount(userId, dto);
  }

  /** GET /vendors/account/me - get own vendor profile */
  @Get('account/me')
  async getMyVendorAccount(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    return this.vendorsService.getVendorByUserId(userId);
  }

  /** PUT /vendors/account/me - update own vendor profile */
  @Put('account/me')
  async updateMyVendorAccount(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateVendorDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.vendorsService.updateVendorAccount(userId, dto);
  }

  // ─────────────────────────────────────────────
  // VENDOR BOOKING ROUTES
  // ─────────────────────────────────────────────

  /**
   * POST /vendors/bookings - owner or client creates a booking
   */
  @Post('bookings')
  async createBooking(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateVendorBookingDto,
  ) {
    const userId = await this.getUserId(authorization);
    const ownerAccountId = await this.getOwnerAccountId(userId);
    return this.vendorsService.createVendorBooking(userId, dto, ownerAccountId || undefined);
  }

  /**
   * GET /vendors/bookings/mine - vendor sees their own bookings
   */
  @Get('bookings/mine')
  async getMyBookings(
    @Headers('authorization') authorization: string,
    @Query('status') status: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.vendorsService.getVendorBookings(userId, status);
  }

  /**
   * GET /vendors/bookings/owner - owner sees all vendor bookings they made
   */
  @Get('bookings/owner')
  async getOwnerBookings(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    const ownerAccountId = await this.getOwnerAccountId(userId);
    if (!ownerAccountId) throw new UnauthorizedException('Not an owner account');
    return this.vendorsService.getOwnerVendorBookings(ownerAccountId);
  }

  /**
   * GET /vendors/bookings/by-event/:eventId - vendor bookings for a specific event
   */
  @Get('bookings/by-event/:eventId')
  async getBookingsByEvent(
    @Headers('authorization') authorization: string,
    @Param('eventId') eventId: string,
  ) {
    const userId = await this.getUserId(authorization);
    const ownerAccountId = await this.getOwnerAccountId(userId);
    if (!ownerAccountId) return [];
    return this.vendorsService.getOwnerVendorBookingsByEvent(eventId, ownerAccountId);
  }

  /**
   * GET /vendors/bookings/:id - get single vendor booking by ID
   * NOTE: must be defined after literal routes (mine, owner, by-event)
   */
  @Get('bookings/:id')
  async getBookingById(
    @Headers('authorization') authorization: string,
    @Param('id') bookingId: string,
  ) {
    await this.getUserId(authorization);
    return this.vendorsService.getVendorBookingById(bookingId);
  }

  /**
   * PUT /vendors/bookings/:id - update booking status
   */
  @Put('bookings/:id')
  async updateBooking(
    @Headers('authorization') authorization: string,
    @Param('id') bookingId: string,
    @Body() dto: UpdateVendorBookingDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.vendorsService.updateVendorBooking(bookingId, userId, dto);
  }

  // ─────────────────────────────────────────────
  // REVIEWS
  // ─────────────────────────────────────────────

  /** POST /vendors/reviews */
  @Post('reviews')
  async createReview(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateVendorReviewDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.vendorsService.createReview(userId, dto);
  }
}
