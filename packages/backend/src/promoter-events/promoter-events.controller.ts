import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { PromoterEventsService } from './promoter-events.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreatePromoterEventDto,
  UpdatePromoterEventDto,
  CreateTicketTierDto,
  UpdateTicketTierDto,
} from './dto/promoter-event.dto';

@Controller('promoter-events')
export class PromoterEventsController {
  constructor(
    private readonly service: PromoterEventsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    if (token.startsWith('local-')) return token.replace('local-', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ── PUBLIC routes (no auth) ───────────────────────────────────

  @Get('public')
  listPublicEvents(
    @Query('city') city?: string,
    @Query('category') category?: string,
  ) {
    return this.service.listPublicEvents(city, category);
  }

  @Get('public/:id')
  getPublicEvent(@Param('id') id: string) {
    return this.service.getPublicEvent(id);
  }

  @Post('public/:id/checkout')
  createCheckout(
    @Param('id') id: string,
    @Body() body: { tier_id: string; quantity: number; buyer_email: string },
  ) {
    return this.service.createTicketCheckout(id, body.tier_id, body.quantity || 1, body.buyer_email);
  }

  // ── PROTECTED routes ──────────────────────────────────────────

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() dto: CreatePromoterEventDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.createEvent(userId, dto);
  }

  @Get('mine')
  async listMine(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.service.listEvents(userId);
  }

  @Get(':id')
  async getOne(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.getEvent(userId, id);
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromoterEventDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.updateEvent(userId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.deleteEvent(userId, id);
  }

  // ticket tiers
  @Post(':id/tiers')
  async addTier(
    @Headers('authorization') auth: string,
    @Param('id') eventId: string,
    @Body() dto: CreateTicketTierDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.addTicketTier(userId, eventId, dto);
  }

  @Put('tiers/:tierId')
  async updateTier(
    @Headers('authorization') auth: string,
    @Param('tierId') tierId: string,
    @Body() dto: UpdateTicketTierDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.updateTicketTier(userId, tierId, dto);
  }

  @Delete('tiers/:tierId')
  async deleteTier(
    @Headers('authorization') auth: string,
    @Param('tierId') tierId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.deleteTicketTier(userId, tierId);
  }

  // attendees
  @Get(':id/attendees')
  async getAttendees(
    @Headers('authorization') auth: string,
    @Param('id') eventId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.getEventAttendees(userId, eventId);
  }
}
