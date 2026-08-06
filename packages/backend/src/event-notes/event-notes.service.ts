import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEventNoteDto } from './dto/event-note.dto';

@Injectable()
export class EventNotesService {
  constructor(private readonly supabaseService: SupabaseService) {}

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

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_notes')
      .insert({
        event_id: eventId,
        author_id: userId,
        author_name: author.name,
        author_role: author.role,
        content: dto.content.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
