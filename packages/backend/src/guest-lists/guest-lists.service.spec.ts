import { GuestListsService } from './guest-lists.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

function databaseWithResults(
  results: Array<{ data?: unknown; error?: unknown }>,
) {
  const queries: Array<Record<string, jest.Mock>> = [];
  const database = {
    from: jest.fn(() => {
      const result = results.shift() ?? { data: null, error: null };
      const query: Record<string, jest.Mock> = {};
      for (const method of [
        'select',
        'eq',
        'in',
        'insert',
        'update',
        'delete',
        'maybeSingle',
        'single',
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
  const service = new GuestListsService(
    { getAdminClient: () => database } as unknown as SupabaseService,
    {} as SmsNotificationsService,
  );
  return { service, database, queries };
}

describe('GuestListsService RSVP synchronization', () => {
  const guest = {
    id: 'rsvp-1',
    guest_name: 'Test Guest',
    guest_phone: null,
    plus_ones: 2,
    status: 'attending',
  };

  it('updates the linked guest without resetting check-in status', async () => {
    const { service, queries } = databaseWithResults([
      { data: { id: 10 } },
      { data: { id: 20 } },
      { error: null },
    ]);
    await service.syncRsvpGuest(1, guest);
    expect(queries[2].update).toHaveBeenCalledWith({
      rsvp_guest_id: 'rsvp-1',
      name: 'Test Guest',
      phone: null,
      plus_one_count: 2,
      updated_at: expect.any(String),
    });
    expect(queries[2].eq).toHaveBeenCalledWith('id', 20);
    expect(queries[2].insert).not.toHaveBeenCalled();
  });

  it('creates an attending guest with the stable RSVP link', async () => {
    const { service, queries } = databaseWithResults([
      { data: { id: 10 } },
      { data: null },
      { data: [] },
      { error: null },
    ]);
    await service.syncRsvpGuest(1, guest);
    expect(queries[3].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_list_id: 10,
        rsvp_guest_id: 'rsvp-1',
        has_arrived: false,
      }),
    );
  });

  it('links a unique legacy import without resetting its arrival', async () => {
    const { service, queries } = databaseWithResults([
      { data: { id: 10 } },
      { data: null },
      {
        data: [
          { id: 20, name: 'Test Guest', phone: null, rsvp_guest_id: null },
        ],
      },
      { error: null },
    ]);
    await service.syncRsvpGuest(1, guest);
    expect(queries[3].update).toHaveBeenCalledWith(
      expect.objectContaining({ rsvp_guest_id: 'rsvp-1' }),
    );
    expect(queries[3].eq).toHaveBeenCalledWith('id', 20);
    expect(queries[3].update.mock.calls[0][0]).not.toHaveProperty(
      'has_arrived',
    );
  });

  it('removes only the linked guest after a decline', async () => {
    const { service, queries } = databaseWithResults([{ error: null }]);
    await service.syncRsvpGuest(1, { ...guest, status: 'declined' });
    expect(queries[0].delete).toHaveBeenCalled();
    expect(queries[0].eq).toHaveBeenCalledWith('rsvp_guest_id', 'rsvp-1');
  });

  it('reconciles imported rows by RSVP ID, including later declines', async () => {
    const { service } = databaseWithResults([
      { data: { id: 10, event_id: 1 } },
      { data: { intake_form_id: 'form-1', client_id: null } },
      { data: [] },
      { data: [guest, { ...guest, id: 'rsvp-2', status: 'declined' }] },
      { data: [{ rsvp_guest_id: guest.id }] },
    ]);
    const sync = jest
      .spyOn(service, 'syncRsvpGuest')
      .mockResolvedValue(undefined);
    await expect(service.importFromRsvp(10)).resolves.toEqual({
      imported: 0,
      skipped: 1,
    });
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ id: 'rsvp-2', status: 'declined' }),
    );
  });

  it.each(['lookup', 'update', 'delete'])(
    'does not hide a %s failure',
    async (operation) => {
      const failure = new Error('Database unavailable');
      const results =
        operation === 'lookup'
          ? [{ error: failure }]
          : operation === 'update'
            ? [{ data: { id: 10 } }, { data: { id: 20 } }, { error: failure }]
            : [{ error: failure }];
      const { service } = databaseWithResults(results);
      await expect(
        service.syncRsvpGuest(1, {
          ...guest,
          status: operation === 'delete' ? 'declined' : 'attending',
        }),
      ).rejects.toThrow(failure);
    },
  );
});
