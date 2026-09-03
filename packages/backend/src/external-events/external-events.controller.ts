import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { EventSourcesService } from './event-sources.service';
import { ExternalEventsService } from './external-events.service';
import { DiscoveryService } from './discovery.service';
import {
  CreateEventSourceDto,
  UpdateEventSourceDto,
} from './dto/event-source.dto';
import {
  CreateDiscoveryCandidateDto,
  RunDiscoveryDto,
} from './dto/discovery-candidate.dto';

const ADMIN_EMAIL = 'admin@eventecos.com';

@Controller('external-events')
export class ExternalEventsController {
  constructor(
    private readonly eventSourcesService: EventSourcesService,
    private readonly externalEventsService: ExternalEventsService,
    private readonly discoveryService: DiscoveryService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Mirrors admin.controller.ts's per-request admin check — same
  // hardcoded admin account, no separate roles/guards module exists yet.
  private async verifyAdmin(req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('No token provided');
    const {
      data: { user },
      error,
    } = await this.supabaseService.getAdminClient().auth.getUser(token);
    if (error || !user || user.email !== ADMIN_EMAIL) {
      throw new UnauthorizedException('Admin access required');
    }
    return user;
  }

  // ── public: merged into the /events page ────────────────────────

  @Get('events')
  getPublicEvents(
    @Query('zip_code') zipCode?: string,
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('radius_miles') radiusMiles?: string,
  ) {
    return this.externalEventsService.getPublicEvents({
      zip_code: zipCode,
      city,
      category,
      radius_miles: radiusMiles ? parseInt(radiusMiles, 10) : undefined,
    });
  }

  // ── admin: source registry ───────────────────────────────────────

  @Get('admin/sources')
  async listSources(@Req() req: Request, @Query('status') status?: string) {
    await this.verifyAdmin(req);
    return this.eventSourcesService.listSources(status);
  }

  @Get('admin/sources/:id')
  async getSource(@Req() req: Request, @Param('id') id: string) {
    await this.verifyAdmin(req);
    return this.eventSourcesService.getSource(id);
  }

  @Post('admin/sources')
  async createSource(@Req() req: Request, @Body() dto: CreateEventSourceDto) {
    const admin = await this.verifyAdmin(req);
    return this.eventSourcesService.createSource(dto, admin.email || undefined);
  }

  @Patch('admin/sources/:id')
  async updateSource(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateEventSourceDto,
  ) {
    await this.verifyAdmin(req);
    return this.eventSourcesService.updateSource(id, dto);
  }

  @Patch('admin/sources/:id/status')
  async transitionStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('status')
    status: 'review_terms' | 'approved' | 'active' | 'rejected' | 'paused',
  ) {
    await this.verifyAdmin(req);
    return this.eventSourcesService.transitionStatus(id, status);
  }

  @Post('admin/sources/:id/sync')
  async syncSource(@Req() req: Request, @Param('id') id: string) {
    await this.verifyAdmin(req);
    return this.eventSourcesService.syncSource(id);
  }

  @Delete('admin/sources/:id')
  async deleteSource(@Req() req: Request, @Param('id') id: string) {
    await this.verifyAdmin(req);
    await this.eventSourcesService.deleteSource(id);
    return { success: true };
  }

  // ── admin: discovery candidates ──────────────────────────────────

  @Get('admin/discovery-candidates')
  async listCandidates(@Req() req: Request, @Query('status') status?: string) {
    await this.verifyAdmin(req);
    return this.discoveryService.listCandidates(status);
  }

  @Post('admin/discovery-candidates')
  async addCandidate(
    @Req() req: Request,
    @Body() dto: CreateDiscoveryCandidateDto,
  ) {
    await this.verifyAdmin(req);
    return this.discoveryService.addCandidate(dto);
  }

  @Patch('admin/discovery-candidates/:id/dismiss')
  async dismissCandidate(@Req() req: Request, @Param('id') id: string) {
    const admin = await this.verifyAdmin(req);
    return this.discoveryService.dismissCandidate(id, admin.email || undefined);
  }

  /** Promotes a reviewed candidate straight into the source registry as `discovered`. */
  @Post('admin/discovery-candidates/:id/promote')
  async promoteCandidate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateEventSourceDto,
  ) {
    const admin = await this.verifyAdmin(req);
    const source = await this.eventSourcesService.createSource(
      dto,
      admin.email || undefined,
    );
    await this.discoveryService.markPromoted(
      id,
      source.id,
      admin.email || undefined,
    );
    return source;
  }

  @Post('admin/discovery/run')
  async runDiscovery(@Req() req: Request, @Body() dto: RunDiscoveryDto) {
    await this.verifyAdmin(req);
    return this.discoveryService.runDiscovery(dto.queries);
  }

  @Get('admin/discovery/status')
  async discoveryStatus(@Req() req: Request) {
    await this.verifyAdmin(req);
    return {
      searchProviderConfigured:
        this.discoveryService.isSearchProviderConfigured(),
    };
  }
}
