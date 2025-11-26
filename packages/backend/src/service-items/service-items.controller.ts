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

  @Get()
  async findAll(@Headers('authorization') authorization: string): Promise<ServiceItem[]> {
    const token = this.extractToken(authorization);
    this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.findAll();
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: ServiceItemCategory,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem[]> {
    const token = this.extractToken(authorization);
    this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.findByCategory(category);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem | null> {
    const token = this.extractToken(authorization);
    this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.findOne(id);
  }

  @Post()
  async create(
    @Body() item: Partial<ServiceItem>,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem> {
    const token = this.extractToken(authorization);
    this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.create(item);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() item: Partial<ServiceItem>,
    @Headers('authorization') authorization: string,
  ): Promise<ServiceItem | null> {
    const token = this.extractToken(authorization);
    this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.update(id, item);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ): Promise<void> {
    const token = this.extractToken(authorization);
    this.supabaseService.setAuthContext(token);
    return this.serviceItemsService.delete(id);
  }
}
