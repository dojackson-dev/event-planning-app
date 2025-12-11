import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { ServiceItemsService, ServiceItem } from './service-items.service';
import { ServiceItemCategory } from '../entities/service-item.entity';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('service-items')
export class ServiceItemsController {
  constructor(
    private readonly serviceItemsService: ServiceItemsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization: string): Promise<string> {
    const token = this.extractToken(authorization);
    
    // Handle dev tokens (local-<uuid> format)
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }
    
    // Handle Supabase tokens
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabaseWithAuth.auth.getUser(token);
    
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    
    return user.id;
  }

  @Get()
  async findAll(@Headers('authorization') authorization: string): Promise<ServiceItem[]> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.findAll(supabaseWithAuth, userId);
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: ServiceItemCategory,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem[]> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.findByCategory(supabaseWithAuth, userId, category);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem | null> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.findOne(supabaseWithAuth, userId, id);
  }

  @Post()
  async create(
    @Body() item: Partial<ServiceItem>,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.create(supabaseWithAuth, userId, item);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() item: Partial<ServiceItem>,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem | null> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.update(supabaseWithAuth, userId, id, item);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.delete(supabaseWithAuth, userId, id);
  }
}
