import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { MessageTemplatesService } from './message-templates.service';
import { MessageTemplate } from '../entities/message-template.entity';

@Controller('message-templates')
export class MessageTemplatesController {
  constructor(private readonly messageTemplatesService: MessageTemplatesService) {}

  @Get()
  async findAll(): Promise<MessageTemplate[]> {
    return this.messageTemplatesService.findAll();
  }

  @Get('active')
  async findActive(): Promise<MessageTemplate[]> {
    return this.messageTemplatesService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MessageTemplate | null> {
    return this.messageTemplatesService.findOne(id);
  }

  @Post()
  async create(@Body() template: Partial<MessageTemplate>): Promise<MessageTemplate> {
    return this.messageTemplatesService.create(template);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() template: Partial<MessageTemplate>,
  ): Promise<MessageTemplate | null> {
    return this.messageTemplatesService.update(id, template);
  }

  @Post(':id/toggle')
  async toggleActive(@Param('id', ParseIntPipe) id: number): Promise<MessageTemplate | null> {
    return this.messageTemplatesService.toggleActive(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.messageTemplatesService.delete(id);
  }
}
