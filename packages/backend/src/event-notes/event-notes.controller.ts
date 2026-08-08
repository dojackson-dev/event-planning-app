import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { EventNotesService } from './event-notes.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEventNoteDto, UpdateEventNoteDto } from './dto/event-note.dto';

@Controller('event-notes')
export class EventNotesController {
  constructor(
    private readonly eventNotesService: EventNotesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    if (token.startsWith('local-')) return token.replace('local-', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  @Get('event/:eventId')
  async findByEvent(
    @Param('eventId') eventId: string,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.eventNotesService.findByEvent(eventId, userId);
  }

  @Post('event/:eventId')
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateEventNoteDto,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.eventNotesService.create(eventId, userId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    await this.eventNotesService.remove(id, userId);
    return { success: true };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventNoteDto,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.eventNotesService.update(id, userId, dto);
  }

  @Post(':id/send-reminder')
  async sendReminder(
    @Param('id') id: string,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.eventNotesService.sendReminder(id, userId);
  }
}
