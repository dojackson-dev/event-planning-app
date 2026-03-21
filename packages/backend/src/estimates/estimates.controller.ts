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
  ): Promise<Estimate[]> {
    const userId = await this.getUserId(authorization);
    const supabaseAdmin = this.supabaseService.getAdminClient();
    if (ownerId) return this.estimatesService.findByOwner(supabaseAdmin, ownerId);
    return this.estimatesService.findByOwner(supabaseAdmin, userId);
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
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.estimatesService.update(supabase, id, estimateData);
  }

  @Put(':id/status')
  async updateStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<Estimate> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.estimatesService.updateStatus(supabase, id, status);
  }

  @Post(':id/items')
  async addItems(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() items: Partial<EstimateItem>[],
  ): Promise<EstimateItem[]> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.estimatesService.createItems(supabase, id, items);
  }

  @Put('items/:itemId')
  async updateItem(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
    @Body() itemData: Partial<EstimateItem>,
  ): Promise<EstimateItem> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.estimatesService.updateItem(supabase, itemId, itemData);
  }

  @Delete('items/:itemId')
  async deleteItem(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.estimatesService.deleteItem(supabase, itemId);
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

  @Delete(':id')
  async delete(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.estimatesService.delete(supabase, id);
  }
}
