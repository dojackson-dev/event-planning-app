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
        'limit',
        'not',
        'update',
        'insert',
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
  const trySend = jest.fn().mockResolvedValue(undefined);
  const service = new RsvpService(
    { getAdminClient: () => database } as unknown as SupabaseService,
    { trySend } as unknown as SmsNotificationsService,
    {} as MailService,
    { syncRsvpGuest } as unknown as GuestListsService,
  );
  return { service, queries, syncRsvpGuest, trySend };
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
      { data: [guest] },
      { data: guest },
      { data: event },
    ]);
    await service.updateGuest(guest.id, form.id, form.contact_phone, {
      guest_name: 'Test Guest',
    });
    expect(queries[2].eq).toHaveBeenCalledWith('intake_form_id', form.id);
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
      { data: [guest] },
      { data: guest },
      { data: event },
    ]);
    await service.updateGuest(guest.id, form.id, form.contact_phone, {
      guest_name: 'Test Guest',
      owner_id: 'other-owner',
      status: 'attending',
    } as { guest_name: string });
    expect(queries[2].update).toHaveBeenCalledWith({
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

  it('names the event in the invite text even when the form has no direct event link', async () => {
    const { service, trySend } = setup([
      { data: { ...form, event_id: null } },
      { data: event },
      { data: { ...guest, guest_phone: '5550001111', rsvp_token: 'tok' } },
      { data: { ...event, name: 'POSM Christmas Party', date: '2026-12-05' } },
      { data: guest },
    ]);
    await service.sendInvite(guest.id, form.id, { ownerId: 'owner-1' });
    expect(trySend).toHaveBeenCalledWith(
      '5550001111',
      expect.stringContaining('POSM Christmas Party on December 5, 2026'),
    );
  });

  describe('duplicate exclusion', () => {
    const ownerActor = { ownerId: 'owner-1' };
    const ownerForm = { ...form, user_id: 'owner-1' };
    const jane = {
      id: 'g-jane',
      guest_name: 'Jane Smith',
      guest_phone: '404-555-0123',
      guest_email: null,
    };

    it('rejects adding a guest with an existing phone number', async () => {
      const { service, queries } = setup([
        { data: ownerForm },
        { data: event },
        { data: [jane] },
      ]);
      await expect(
        service.addGuest(form.id, ownerActor, {
          guest_name: 'Janie S',
          guest_phone: '(404) 555-0123',
        }),
      ).rejects.toThrow('Jane Smith is already on the guest list (same phone)');
      expect(queries.every((q) => q.insert.mock.calls.length === 0)).toBe(true);
    });

    it('adds a guest that is not a duplicate', async () => {
      const { service, queries } = setup([
        { data: ownerForm },
        { data: event },
        { data: [jane] },
        { data: { id: 'new' } },
      ]);
      await expect(
        service.addGuest(form.id, ownerActor, {
          guest_name: 'Bob Jones',
          guest_phone: '404-555-9999',
        }),
      ).resolves.toEqual({ id: 'new' });
      expect(queries).toHaveLength(4);
    });

    it('skips duplicates in a bulk add, against the list and within the upload', async () => {
      const { service, queries } = setup([
        { data: ownerForm },
        { data: event },
        { data: [jane] },
        { data: [{ id: 'n1' }, { id: 'n2' }] },
      ]);
      const result = await service.bulkAddGuestsDetailed(form.id, ownerActor, [
        { guest_name: 'Jane S', guest_phone: '4045550123' },
        { guest_name: 'Amy Lee', guest_email: 'amy@x.com' },
        { guest_name: 'Amy L.', guest_email: 'AMY@x.com' },
        { guest_name: 'Ben Cole', guest_phone: '404-555-7777' },
        { guest_name: '   ' },
      ]);
      expect(result.added).toHaveLength(2);
      expect(result.skipped).toEqual([
        {
          guest_name: 'Jane S',
          reason: 'Duplicate of Jane Smith (same phone)',
        },
        { guest_name: 'Amy L.', reason: 'Duplicate of Amy Lee (same email)' },
      ]);
      expect(queries[3].insert).toHaveBeenCalledWith([
        expect.objectContaining({ guest_name: 'Amy Lee' }),
        expect.objectContaining({ guest_name: 'Ben Cole' }),
      ]);
    });

    it('does not insert anything when every bulk guest is a duplicate', async () => {
      const { service, queries } = setup([
        { data: ownerForm },
        { data: event },
        { data: [jane] },
      ]);
      const result = await service.bulkAddGuestsDetailed(form.id, ownerActor, [
        { guest_name: 'Jane', guest_phone: '404 555 0123' },
      ]);
      expect(result.added).toEqual([]);
      expect(result.skipped).toHaveLength(1);
      expect(queries).toHaveLength(3);
    });

    it('rejects an edit that changes a guest into a duplicate', async () => {
      const bob = {
        id: 'g-bob',
        guest_name: 'Bob',
        guest_phone: '404-555-9999',
      };
      const { service } = setup([
        { data: ownerForm },
        { data: event },
        { data: [jane, bob] },
      ]);
      await expect(
        service.updateGuest('g-bob', form.id, ownerActor, {
          guest_phone: '(404) 555-0123',
        }),
      ).rejects.toThrow('Jane Smith is already on the guest list (same phone)');
    });

    it('does not text the same phone twice when sending all invites', async () => {
      const invitedJane = { ...jane, sms_sent_at: '2026-10-01T00:00:00Z' };
      const dupe = {
        id: 'g-dupe',
        guest_name: 'Jane (cell)',
        guest_phone: '+14045550123',
        sms_sent_at: null,
        rsvp_token: 't1',
      };
      const bob = {
        id: 'g-bob',
        guest_name: 'Bob',
        guest_phone: '404-555-9999',
        sms_sent_at: null,
        rsvp_token: 't2',
      };
      const bobTwin = {
        id: 'g-bob2',
        guest_name: 'Bobby',
        guest_phone: '(404) 555-9999',
        sms_sent_at: null,
        rsvp_token: 't3',
      };
      const { service, trySend } = setup([
        { data: ownerForm },
        { data: event },
        { data: [invitedJane, dupe, bob, bobTwin] },
        { data: event },
        { data: null },
      ]);
      const result = await service.sendAllInvites(form.id, ownerActor);
      expect(result).toEqual({ sent: 1, skipped: 0, duplicates: 2 });
      expect(trySend).toHaveBeenCalledTimes(1);
      expect(trySend).toHaveBeenCalledWith('404-555-9999', expect.any(String));
    });
  });

  describe('clients added as team members', () => {
    const teamPhone = '+19990000000';

    it('lets a team member manage the event RSVP list', async () => {
      const { service } = setup([
        { data: form },
        { data: [{ id: event.id }] },
        { data: [{ id: 'team-1' }] },
        { data: [] },
        { data: [] },
      ]);
      await expect(service.getGuests(form.id, teamPhone)).resolves.toEqual([]);
    });

    it('rejects a phone that is neither the contact, a team member, nor an invoice contact', async () => {
      const { service } = setup([
        { data: form },
        { data: [{ id: event.id }] },
        { data: [] },
        { data: [] },
      ]);
      await expect(service.getGuests(form.id, teamPhone)).rejects.toThrow(
        'not authorised',
      );
    });

    it('lists team events in the client RSVP list', async () => {
      const { service } = setup([
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [{ event_id: event.id }] },
        { data: [] },
        { data: [{ id: event.id, intake_form_id: form.id }] },
        {
          data: [
            {
              id: form.id,
              user_id: 'owner-1',
              contact_name: 'Host',
              event_id: null,
            },
          ],
        },
        {
          data: { ...event, name: 'POSM Christmas Party', date: '2026-12-05' },
        },
        { data: [] },
      ]);
      await expect(service.getEventsForClient(teamPhone)).resolves.toEqual([
        expect.objectContaining({
          intake_form_id: form.id,
          event_id: event.id,
          event_name: 'POSM Christmas Party',
        }),
      ]);
    });
  });
});
