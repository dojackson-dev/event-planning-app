import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, Query } from '@nestjs/common';
import { EstimatesService, Estimate, EstimateItem } from './estimates.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('estimates')
export class EstimatesController {
  constructor(
    private readonly estimatesService: EstimatesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization: string): string {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization: string): Promise<string> {
    const token = this.extractToken(authorization);
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
    @Query('ownerId') ownerId?: string,
    @Query('intakeFormId') intakeFormId?: string,
    @Query('venueId') venueId?: string,
  ): Promise<Estimate[]> {
    const userId = await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    if (intakeFormId) return this.estimatesService.findByIntakeForm(supabaseAdmin, intakeFormId);
    if (ownerId) return this.estimatesService.findByOwner(supabaseAdmin, ownerId, venueId);
    return this.estimatesService.findByOwner(supabaseAdmin, userId, venueId);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<Estimate> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.findOne(supabaseAdmin, id);
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() body: { estimate: Partial<Estimate>; items?: Partial<EstimateItem>[] },
  ): Promise<Estimate> {
    const userId = await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.create(supabaseAdmin, userId, body.estimate, body.items);
  }

  @Put(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() estimateData: Partial<Estimate>,
  ): Promise<Estimate> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.update(supabaseAdmin, id, estimateData);
  }

  @Put(':id/status')
  async updateStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<Estimate> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.updateStatus(supabaseAdmin, id, status);
  }

  @Post(':id/items')
  async addItems(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() items: Partial<EstimateItem>[],
  ): Promise<EstimateItem[]> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.createItems(supabaseAdmin, id, items);
  }

  @Put('items/:itemId')
  async updateItem(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
    @Body() itemData: Partial<EstimateItem>,
  ): Promise<EstimateItem> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.updateItem(supabaseAdmin, itemId, itemData);
  }

  @Delete('items/:itemId')
  async deleteItem(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.deleteItem(supabaseAdmin, itemId);
  }

  @Post(':id/convert-to-invoice')
  async convertToInvoice(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any> {
    const userId = await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.convertToInvoice(supabaseAdmin, userId, id);
  }

  // Public endpoint — no auth required. Marks an estimate as viewed by the client (first open only).
  @Post(':id/viewed')
  async markViewed(@Param('id') id: string): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    await admin
      .from('estimates')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', id)
      .is('viewed_at', null);
  }

  @Delete(':id')
  async delete(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.estimatesService.delete(supabaseAdmin, id);
  }
}
