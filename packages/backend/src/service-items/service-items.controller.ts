import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ServiceItemsService } from './service-items.service';
import { ServiceItem, ServiceItemCategory } from '../entities/service-item.entity';

@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  @Get()
  async findAll(): Promise<ServiceItem[]> {
    return this.serviceItemsService.findAll();
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: ServiceItemCategory): Promise<ServiceItem[]> {
    return this.serviceItemsService.findByCategory(category);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ServiceItem | null> {
    return this.serviceItemsService.findOne(id);
  }

  @Post()
  async create(@Body() item: Partial<ServiceItem>): Promise<ServiceItem> {
    return this.serviceItemsService.create(item);
  }

  @Post('seed')
  async seed(): Promise<{ message: string }> {
    await this.serviceItemsService.seedDefaultItems();
    return { message: 'Default service items seeded successfully' };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() item: Partial<ServiceItem>,
  ): Promise<ServiceItem | null> {
    return this.serviceItemsService.update(id, item);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.serviceItemsService.delete(id);
  }
}
