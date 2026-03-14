import { Controller, Get, Patch, Post, Param, Query, Body, Req, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import type { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

const ADMIN_EMAIL = 'admin@dovenuesuite.com';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async verifyAdmin(req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('No token provided');

    const { data: { user }, error } = await this.supabaseService.getAdminClient().auth.getUser(token);
    if (error || !user || user.email !== ADMIN_EMAIL) {
      throw new UnauthorizedException('Admin access required');
    }
    return user;
  }

  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    await this.verifyAdmin(req);
    return this.adminService.getDashboardStats();
  }

  @Get('owners')
  async getOwners(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getOwners(parseInt(page), parseInt(limit), search);
  }

  @Get('owners/:id')
  async getOwnerDetail(@Req() req: Request, @Param('id') id: string) {
    await this.verifyAdmin(req);
    return this.adminService.getOwnerDetail(id);
  }

  @Patch('owners/:id/status')
  async updateOwnerStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    await this.verifyAdmin(req);
    return this.adminService.updateOwnerStatus(id, body.status);
  }

  @Get('trial-settings')
  async getTrialSettings(@Req() req: Request) {
    await this.verifyAdmin(req);
    return this.adminService.getTrialSettings();
  }

  @Post('trial-settings')
  async updateTrialSettings(@Req() req: Request, @Body() body: { trialDays: number }) {
    await this.verifyAdmin(req);
    return this.adminService.updateTrialSettings(body.trialDays);
  }

  @Get('events')
  async getEvents(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
    @Query('ownerId') ownerId = '',
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getEvents(parseInt(page), parseInt(limit), search, ownerId);
  }

  @Get('bookings')
  async getBookings(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
    @Query('ownerId') ownerId = '',
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getBookings(parseInt(page), parseInt(limit), search, ownerId);
  }

  @Get('clients')
  async getClients(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search = '',
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getClients(parseInt(page), parseInt(limit), search);
  }

  @Get('revenue')
  async getRevenue(@Req() req: Request) {
    await this.verifyAdmin(req);
    return this.adminService.getRevenue();
  }

  @Get('analytics')
  async getAnalytics(@Req() req: Request) {
    await this.verifyAdmin(req);
    return this.adminService.getAnalytics();
  }

  @Get('activity')
  async getActivity(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '100',
    @Query('search') search = '',
    @Query('role') role = '',
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getActivity(parseInt(page), parseInt(limit), search, role);
  }

  @Get('trials')
  async getTrials(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('search') search = '',
  ) {
    await this.verifyAdmin(req);
    return this.adminService.getTrials(parseInt(page), parseInt(limit), search);
  }

  @Patch('owners/:id/trial')
  async updateOwnerTrial(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { action: string; days?: number },
  ) {
    await this.verifyAdmin(req);
    return this.adminService.updateOwnerTrial(id, body.action, body.days);
  }
}
