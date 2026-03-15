import { Controller, Get, Post, Delete, Body, Param, Headers, UnauthorizedException, Query } from '@nestjs/common';
import { MessagingService } from './messaging.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('messages')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getAuth(authHeader: string) {
    if (!authHeader) throw new UnauthorizedException();
    const token = authHeader.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException();
    return { supabase, ownerId: user.id };
  }

  @Get()
  async findAll(
    @Headers('authorization') authHeader: string,
    @Query('eventId') eventId?: string,
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    if (eventId) {
      return this.messagingService.findByEvent(supabase, ownerId, eventId);
    }
    return this.messagingService.findAll(supabase, ownerId);
  }

  @Get('stats')
  async getStats(@Headers('authorization') authHeader: string) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.messagingService.getMessageStats(supabase, ownerId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.messagingService.findOne(supabase, ownerId, id);
  }

  @Post('send')
  async sendMessage(
    @Headers('authorization') authHeader: string,
    @Body() messageData: any,
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.messagingService.sendMessage(supabase, ownerId, messageData);
  }

  @Post('send-bulk')
  async sendBulkMessages(
    @Headers('authorization') authHeader: string,
    @Body() data: { messages: any[] },
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.messagingService.sendBulkMessages(supabase, ownerId, data.messages);
  }

  @Post(':id/refresh-status')
  async refreshStatus(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.messagingService.updateMessageStatus(supabase, ownerId, id);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.messagingService.deleteMessage(supabase, ownerId, id);
  }
}
