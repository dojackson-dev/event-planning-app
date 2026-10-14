import { RsvpService } from './rsvp.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GuestListsService } from '../guest-lists/guest-lists.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { MailService } from '../mail/mail.service';

function setup(results: Array<{ data?: unknown; error?: unknown }>) {
  const queries: Array<Record<string, jest.Mock>> = [];
  const database = {
    from: jest.fn(() => {
      const result = results.shift() ?? { data: null };
      const query: Record<string, jest.Mock> = {};
      for (const method of [
        'select',
        'eq',
        'or',
        'in',
        'order',
        'update',
        'delete',
        'single',
        'maybeSingle',
      ]) {
        query[method] = jest.fn(() => query);
      }
      query.then = jest.fn((resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
      );
      queries.push(query);
      return query;
    }),
  };
  const syncRsvpGuest = jest.fn().mockResolvedValue(undefined);
  const service = new RsvpService(
    { getAdminClient: () => database } as unknown as SupabaseService,
    {} as SmsNotificationsService,
    {} as MailService,
    { syncRsvpGuest } as unknown as GuestListsService,
  );
  return { service, queries, syncRsvpGuest };
}

describe('Shared event RSVP management', () => {
  const form = { id: 'form-1', event_id: 10, contact_phone: '+15551234567' };
  const event = { id: 10, owner_id: 'owner-1' };
  const guest = {
    id: 'guest-1',
    guest_name: 'Test Guest',
    status: 'attending',
    plus_ones: 1,
  };

  it('lets the event owner read the same guest and arrival status', async () => {
    const { service, syncRsvpGuest } = setup([
      { data: form },
      { data: event },
      { data: [guest] },
      { data: event },
      {
        data: [
          {
            rsvp_guest_id: guest.id,
            has_arrived: true,
            arrived_at: '2026-10-14T12:00:00Z',
          },
        ],
      },
    ]);
    const guests = await service.getGuests(form.id, { ownerId: 'owner-1' });
    expect(guests[0]).toMatchObject({ ...guest, has_arrived: true });
    expect(syncRsvpGuest).toHaveBeenCalledWith(10, guest);
  });

  it('rejects another owner before reading or changing guests', async () => {
    const { service, queries, syncRsvpGuest } = setup([
      { data: form },
      { data: event },
    ]);
    await expect(
      service.getGuests(form.id, { ownerId: 'other-owner' }),
    ).rejects.toThrow('Event not found');
    expect(queries).toHaveLength(2);
    expect(syncRsvpGuest).not.toHaveBeenCalled();
  });

  it('synchronizes client edits and scopes the update to its intake form', async () => {
    const { service, queries, syncRsvpGuest } = setup([
      { data: form },
      { data: guest },
      { data: event },
    ]);
    await service.updateGuest(guest.id, form.id, form.contact_phone, {
      guest_name: 'Test Guest',
    });
    expect(queries[1].eq).toHaveBeenCalledWith('intake_form_id', form.id);
    expect(syncRsvpGuest).toHaveBeenCalledWith(event.id, guest);
  });

  it('resolves legacy events through either intake form or client link', async () => {
    const { service, queries } = setup([
      { data: { ...form, event_id: null } },
      { data: event },
      { data: [] },
    ]);
    await service.getGuests(form.id, { ownerId: 'owner-1' });
    expect(queries[1].or).toHaveBeenCalledWith(
      'intake_form_id.eq.form-1,client_id.eq.form-1',
    );
  });

  it('does not report success when a client edit cannot sync', async () => {
    const { service, syncRsvpGuest } = setup([
      { data: form },
      { data: guest },
      { data: event },
    ]);
    syncRsvpGuest.mockRejectedValueOnce(new Error('Sync failed'));
    await expect(
      service.updateGuest(guest.id, form.id, form.contact_phone, {}),
    ).rejects.toThrow('Sync failed');
  });

  it('ignores forged ownership and RSVP status fields in edits', async () => {
    const { service, queries } = setup([
      { data: form },
      { data: guest },
      { data: event },
    ]);
    await service.updateGuest(guest.id, form.id, form.contact_phone, {
      guest_name: 'Test Guest',
      owner_id: 'other-owner',
      status: 'attending',
    } as { guest_name: string });
    expect(queries[1].update).toHaveBeenCalledWith({
      guest_name: 'Test Guest',
      updated_at: expect.any(String),
    });
  });

  it('syncs a public reply before reporting success', async () => {
    const { service, syncRsvpGuest } = setup([
      { data: { ...guest, intake_form_id: form.id } },
      { data: guest },
      { data: { id: form.id, event_id: event.id } },
      { data: event },
    ]);
    await expect(
      service.respondToInvite('invite-token', undefined, {
        status: 'attending',
      }),
    ).resolves.toEqual({ success: true, status: 'attending' });
    expect(syncRsvpGuest).toHaveBeenCalledWith(event.id, guest);
  });

  it('surfaces a public reply sync failure so a retry can repair it', async () => {
    const { service, syncRsvpGuest } = setup([
      { data: { ...guest, intake_form_id: form.id } },
      { data: guest },
      { data: { id: form.id, event_id: event.id } },
      { data: event },
    ]);
    syncRsvpGuest.mockRejectedValueOnce(new Error('Sync failed'));
    await expect(
      service.respondToInvite('invite-token', undefined, {
        status: 'attending',
      }),
    ).rejects.toThrow('Sync failed');
  });
});
