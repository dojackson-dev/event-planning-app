import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEventNoteDto, UpdateEventNoteDto } from './dto/event-note.dto';
import { TwilioService } from '../messaging/twilio.service';

@Injectable()
export class EventNotesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly twilioService: TwilioService,
  ) {}

  /**
   * Confirms the user has access to the event before allowing
   * notes to be read/created. Covers the event owner, admins, and
   * vendors who have a booking tied to this event.
   *
   * NOTE: artist_bookings and promoter_events aren't currently linked to the
   * `event` table via event_id in the schema, so artist/promoter access isn't
   * wired up here yet.
   */
  private async assertEventAccess(
    eventId: string,
    userId: string,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();

    const { data: event, error: eventError } = await admin
      .from('event')
      .select('id, owner_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) throw new NotFoundException('Event not found');
    if (event.owner_id === userId) return;

    const { data: user } = await admin
      .from('users')
      .select('role, roles')
      .eq('id', userId)
      .maybeSingle();

    const roles: string[] =
      Array.isArray(user?.roles) && user.roles.length > 0
        ? user.roles
        : user?.role
          ? [user.role]
          : [];

    if (roles.includes('admin')) return;

    if (roles.includes('vendor')) {
      const { data: vendorBooking } = await admin
        .from('vendor_bookings')
        .select('id, vendor_accounts!inner(user_id)')
        .eq('event_id', eventId)
        .eq('vendor_accounts.user_id', userId)
        .maybeSingle();
      if (vendorBooking) return;
    }

    throw new ForbiddenException('You do not have access to this event');
  }

  private async getAuthorProfile(
    userId: string,
  ): Promise<{ name: string; role: string }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: user } = await admin
      .from('users')
      .select('first_name, last_name, email, role')
      .eq('id', userId)
      .maybeSingle();

    const name =
      [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
      user?.email ||
      'Unknown';

    return { name, role: user?.role || 'unknown' };
  }

  async findByEvent(eventId: string, userId: string): Promise<any[]> {
    await this.assertEventAccess(eventId, userId);

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_notes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(
    eventId: string,
    userId: string,
    dto: CreateEventNoteDto,
  ): Promise<any> {
    if (!dto.content || !dto.content.trim()) {
      throw new ForbiddenException('Note content cannot be empty');
    }

    await this.assertEventAccess(eventId, userId);
    const author = await this.getAuthorProfile(userId);

    const reminderFields = this.buildReminderFields(dto);

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_notes')
      .insert({
        event_id: eventId,
        author_id: userId,
        author_name: author.name,
        author_role: author.role,
        content: dto.content.trim(),
        updated_at: new Date().toISOString(),
        ...reminderFields,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(
    noteId: string,
    userId: string,
    dto: UpdateEventNoteDto,
  ): Promise<any> {
    const admin = this.supabaseService.getAdminClient();

    const { data: note } = await admin
      .from('event_notes')
      .select('id, author_id, event_id')
      .eq('id', noteId)
      .maybeSingle();

    if (!note) throw new NotFoundException('Note not found');
    if (note.author_id !== userId) {
      await this.assertEventAccess(note.event_id, userId);
    }

    const reminderFields = this.buildReminderFields(dto);
    const updates: any = {
      updated_at: new Date().toISOString(),
      ...reminderFields,
    };
    if (dto.content !== undefined) updates.content = dto.content.trim();

    const { data, error } = await admin
      .from('event_notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async sendReminder(
    noteId: string,
    userId: string,
  ): Promise<{ sent: boolean; message?: string }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: note } = await admin
      .from('event_notes')
      .select('*')
      .eq('id', noteId)
      .maybeSingle();

    if (!note) throw new NotFoundException('Note not found');
    await this.assertEventAccess(note.event_id, userId);

    if (!note.reminder_enabled) {
      return { sent: false, message: 'Reminder not enabled on this note' };
    }
    if (!note.reminder_phone) {
      return { sent: false, message: 'No phone number set for reminder' };
    }
    if (note.reminder_sent_at) {
      return { sent: false, message: 'Reminder already sent' };
    }

    const smsBody = note.reminder_message || note.content;
    try {
      await this.twilioService.sendSMS(note.reminder_phone, smsBody);
      await admin
        .from('event_notes')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', noteId);
      return { sent: true };
    } catch (err: any) {
      return { sent: false, message: err.message };
    }
  }

  private buildReminderFields(
    dto: CreateEventNoteDto | UpdateEventNoteDto,
  ): Record<string, any> {
    const fields: Record<string, any> = {
      reminder_enabled: dto.reminder_enabled ?? false,
      reminder_type: dto.reminder_type ?? null,
      reminder_value: dto.reminder_value ?? null,
      reminder_date: dto.reminder_date ?? null,
      reminder_message: dto.reminder_message ?? null,
      reminder_phone: dto.reminder_phone ?? null,
      reminder_sent_at: null, // reset whenever reminder settings change
    };

    // Compute the absolute send time
    if (dto.reminder_enabled && dto.reminder_type) {
      if (dto.reminder_type === 'date' && dto.reminder_date) {
        fields.reminder_send_at = new Date(dto.reminder_date).toISOString();
      } else if (
        (dto.reminder_type === 'days' || dto.reminder_type === 'weeks') &&
        dto.event_date &&
        dto.reminder_value
      ) {
        const eventDate = new Date(dto.event_date);
        const offsetMs =
          dto.reminder_type === 'weeks'
            ? dto.reminder_value * 7 * 24 * 60 * 60 * 1000
            : dto.reminder_value * 24 * 60 * 60 * 1000;
        fields.reminder_send_at = new Date(
          eventDate.getTime() - offsetMs,
        ).toISOString();
      }
    } else {
      fields.reminder_send_at = null;
    }

    return fields;
  }

  async remove(noteId: string, userId: string): Promise<void> {
    const admin = this.supabaseService.getAdminClient();

    const { data: note, error: noteError } = await admin
      .from('event_notes')
      .select('id, author_id, event_id')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError) throw noteError;
    if (!note) throw new NotFoundException('Note not found');

    if (note.author_id !== userId) {
      // Not the author — only the event owner (or an admin) may delete it
      await this.assertEventAccess(note.event_id, userId);

      const { data: event } = await admin
        .from('event')
        .select('owner_id')
        .eq('id', note.event_id)
        .maybeSingle();

      const { data: user } = await admin
        .from('users')
        .select('role, roles')
        .eq('id', userId)
        .maybeSingle();
      const roles: string[] =
        Array.isArray(user?.roles) && user.roles.length > 0
          ? user.roles
          : user?.role
            ? [user.role]
            : [];

      if (event?.owner_id !== userId && !roles.includes('admin')) {
        throw new ForbiddenException(
          'Only the note author, event owner, or an admin can delete this note',
        );
      }
    }

    const { error } = await admin.from('event_notes').delete().eq('id', noteId);
    if (error) throw error;
  }
}
