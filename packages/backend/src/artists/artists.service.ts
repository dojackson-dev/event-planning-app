import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateArtistDto, UpdateArtistDto, ArtistSearchDto } from './dto/artist.dto';

@Injectable()
export class ArtistsService {
  private readonly logger = new Logger(ArtistsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ─────────────────────────────────────────────
  // ARTIST ACCOUNT
  // ─────────────────────────────────────────────

  async createArtistAccount(userId: string, dto: CreateArtistDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data: existing } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Artist account already exists for this user');
    }

    const { data, error } = await admin
      .from('artist_accounts')
      .insert({
        user_id: userId,
        artist_name: dto.artistName,
        stage_name: dto.stageName ?? null,
        agent_name: dto.agentName ?? null,
        booking_contact_name: dto.bookingContactName ?? null,
        booking_email: dto.bookingEmail ?? null,
        booking_phone: dto.bookingPhone ?? null,
        agency: dto.agency ?? null,
        location: dto.location ?? null,
        artist_type: dto.artistType,
        genres: dto.genres ?? [],
        description: dto.description ?? null,
        performance_fee_min: dto.performanceFeeMin ?? null,
        performance_fee_max: dto.performanceFeeMax ?? null,
        travel_availability: dto.travelAvailability ?? null,
        set_length_minutes: dto.setLengthMinutes ?? null,
        equipment_needs: dto.equipmentNeeds ?? null,
        hospitality_requirements: dto.hospitalityRequirements ?? null,
        profile_image_url: dto.profileImageUrl ?? null,
        cover_image_url: dto.coverImageUrl ?? null,
        website: dto.website ?? null,
        instagram: dto.instagram ?? null,
        youtube: dto.youtube ?? null,
        spotify: dto.spotify ?? null,
        epk_url: dto.epkUrl ?? null,
        available_for_booking: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Created artist account ${data.id} for user ${userId}`);
    return data;
  }

  async getArtistProfile(userId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('artist_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getArtistById(id: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('artist_accounts')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Artist not found');
    return data;
  }

  async updateArtistProfile(userId: string, dto: UpdateArtistDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data: artist } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!artist) throw new NotFoundException('Artist account not found');

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.artistName !== undefined) update.artist_name = dto.artistName;
    if (dto.stageName !== undefined) update.stage_name = dto.stageName;
    if (dto.agentName !== undefined) update.agent_name = dto.agentName;
    if (dto.bookingContactName !== undefined) update.booking_contact_name = dto.bookingContactName;
    if (dto.bookingEmail !== undefined) update.booking_email = dto.bookingEmail;
    if (dto.bookingPhone !== undefined) update.booking_phone = dto.bookingPhone;
    if (dto.agency !== undefined) update.agency = dto.agency;
    if (dto.location !== undefined) update.location = dto.location;
    if (dto.artistType !== undefined) update.artist_type = dto.artistType;
    if (dto.genres !== undefined) update.genres = dto.genres;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.performanceFeeMin !== undefined) update.performance_fee_min = dto.performanceFeeMin;
    if (dto.performanceFeeMax !== undefined) update.performance_fee_max = dto.performanceFeeMax;
    if (dto.travelAvailability !== undefined) update.travel_availability = dto.travelAvailability;
    if (dto.setLengthMinutes !== undefined) update.set_length_minutes = dto.setLengthMinutes;
    if (dto.equipmentNeeds !== undefined) update.equipment_needs = dto.equipmentNeeds;
    if (dto.hospitalityRequirements !== undefined) update.hospitality_requirements = dto.hospitalityRequirements;
    if (dto.profileImageUrl !== undefined) update.profile_image_url = dto.profileImageUrl;
    if (dto.coverImageUrl !== undefined) update.cover_image_url = dto.coverImageUrl;
    if (dto.website !== undefined) update.website = dto.website;
    if (dto.instagram !== undefined) update.instagram = dto.instagram;
    if (dto.youtube !== undefined) update.youtube = dto.youtube;
    if (dto.spotify !== undefined) update.spotify = dto.spotify;
    if (dto.epkUrl !== undefined) update.epk_url = dto.epkUrl;
    if (dto.availableForBooking !== undefined) update.available_for_booking = dto.availableForBooking;

    const { data, error } = await admin
      .from('artist_accounts')
      .update(update)
      .eq('id', artist.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─────────────────────────────────────────────
  // ARTIST DIRECTORY (owner/promoter discovery)
  // ─────────────────────────────────────────────

  async searchArtists(dto: ArtistSearchDto) {
    const admin = this.supabaseService.getAdminClient();

    let query = admin
      .from('artist_accounts')
      .select('id, artist_name, stage_name, artist_type, genres, location, profile_image_url, performance_fee_min, performance_fee_max, travel_availability, description, instagram, available_for_booking')
      .eq('is_active', true);

    if (dto.artistType) {
      query = query.eq('artist_type', dto.artistType);
    }
    if (dto.location) {
      query = query.ilike('location', `%${dto.location}%`);
    }
    if (dto.availableForBooking !== undefined) {
      query = query.eq('available_for_booking', dto.availableForBooking);
    }
    if (dto.genre) {
      query = query.contains('genres', [dto.genre]);
    }
    if (dto.travelAvailability) {
      // 'National' and 'International' should also match when filtering for national/intl
      if (dto.travelAvailability === 'Local') {
        query = query.eq('travel_availability', 'Local only');
      } else if (dto.travelAvailability === 'Regional') {
        query = query.in('travel_availability', ['Regional (within 200 miles)', 'National', 'International']);
      } else if (dto.travelAvailability === 'National') {
        query = query.in('travel_availability', ['National', 'International']);
      } else if (dto.travelAvailability === 'International') {
        query = query.eq('travel_availability', 'International');
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ─────────────────────────────────────────────
  // ARTIST RIDER
  // ─────────────────────────────────────────────

  async getRider(userId: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data: artist } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!artist) throw new NotFoundException('Artist account not found');

    const { data } = await admin
      .from('artist_riders')
      .select('*')
      .eq('artist_account_id', artist.id)
      .maybeSingle();

    return data ?? null;
  }

  async upsertRider(userId: string, dto: any) {
    const admin = this.supabaseService.getAdminClient();

    const { data: artist } = await admin
      .from('artist_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!artist) throw new NotFoundException('Artist account not found');

    const { data: existing } = await admin
      .from('artist_riders')
      .select('id')
      .eq('artist_account_id', artist.id)
      .maybeSingle();

    const payload = { ...dto, artist_account_id: artist.id, updated_at: new Date().toISOString() };

    if (existing) {
      const { data, error } = await admin
        .from('artist_riders')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    } else {
      const { data, error } = await admin
        .from('artist_riders')
        .insert(payload)
        .select()
        .single();
      if (error) throw new BadRequestException(error.message);
      return data;
    }
  }

  async getPublicRider(artistId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('artist_riders')
      .select('*')
      .eq('artist_account_id', artistId)
      .maybeSingle();
    return data ?? null;
  }

  async getArtistTypes() {
    return [
      { value: 'musician', label: 'Musician / Band', icon: '🎵' },
      { value: 'dj', label: 'DJ', icon: '🎧' },
      { value: 'comedian', label: 'Comedian', icon: '🎤' },
      { value: 'dancer', label: 'Dancer / Dance Group', icon: '💃' },
      { value: 'magician', label: 'Magician', icon: '🎩' },
      { value: 'spoken_word', label: 'Spoken Word / Poet', icon: '📖' },
      { value: 'mc_host', label: 'MC / Host', icon: '🎙️' },
      { value: 'other', label: 'Other', icon: '⭐' },
    ];
  }
}
