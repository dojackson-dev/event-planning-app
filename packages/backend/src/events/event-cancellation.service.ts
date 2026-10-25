import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EventNotesService } from '../event-notes/event-notes.service';

const MIN_REASON = 3;
const MAX_REASON = 1000;

/** Cancels / reinstates an event and records the reason in the event notes. */
@Injectable()
export class EventCancellationService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventNotesService: EventNotesService,
  ) {}

  private async loadOwnedEvent(userId: string, eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event')
      .select('id, owner_id, status')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('Event not found');
    if (data.owner_id !== userId) {
      throw new ForbiddenException('Only the event owner can do this');
    }
    return data as { id: string; owner_id: string; status: string };
  }

  private async setStatus(eventId: string, userId: string, status: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event')
      .update({ status })
      .eq('id', eventId)
      .eq('owner_id', userId)
      .select('id, status')
      .single();
    if (error) throw error;
    return data;
  }

  async cancel(userId: string, eventId: string, reason?: string) {
    const trimmed = (reason ?? '').trim();
    if (trimmed.length < MIN_REASON) {
      throw new BadRequestException('A reason for cancelling is required');
    }
    if (trimmed.length > MAX_REASON) {
      throw new BadRequestException(
        `Reason must be ${MAX_REASON} characters or fewer`,
      );
    }

    const event = await this.loadOwnedEvent(userId, eventId);
    if (event.status === 'cancelled') {
      throw new BadRequestException('This event is already cancelled');
    }
    if (event.status === 'completed') {
      throw new BadRequestException('A completed event cannot be cancelled');
    }

    const updated = await this.setStatus(eventId, userId, 'cancelled');
    try {
      const note = await this.eventNotesService.create(eventId, userId, {
        content: `Event cancelled: ${trimmed}`,
      });
      return { ...updated, note };
    } catch (err) {
      // Never leave an event cancelled without the reason on record.
      await this.setStatus(eventId, userId, event.status);
      throw err;
    }
  }

  async reinstate(userId: string, eventId: string, reason?: string) {
    const event = await this.loadOwnedEvent(userId, eventId);
    if (event.status !== 'cancelled') {
      throw new BadRequestException('This event is not cancelled');
    }

    const updated = await this.setStatus(eventId, userId, 'scheduled');
    const trimmed = (reason ?? '').trim().slice(0, MAX_REASON);
    const note = await this.eventNotesService.create(eventId, userId, {
      content: trimmed
        ? `Event reinstated: ${trimmed}`
        : 'Event reinstated (cancellation reversed).',
    });
    return { ...updated, note };
  }
}
