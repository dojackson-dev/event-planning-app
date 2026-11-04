import { EventsService } from './events.service';

const CLIENT = '5fa761c2-7571-4454-9793-b139970d1b80';
const OWNER = '6e7b0130-9c1d-4a1a-bb02-723a4c67557c';

/** Admin fake: the events query returns `events`; the intake_forms query returns `forms`. */
function serviceWith(events: any[], forms: any[]) {
  const calls: { in?: unknown; eq?: unknown[] } = {};
  const admin = {
    from: jest.fn((table: string) => {
      const q: any = {};
      for (const m of ['select', 'order']) q[m] = jest.fn(() => q);
      q.eq = jest.fn((col: string, val: unknown) => {
        if (table === 'intake_forms') (calls.eq ??= []).push([col, val]);
        return q;
      });
      q.in = jest.fn((col: string, ids: unknown) => {
        calls.in = ids;
        return q;
      });
      q.then = (resolve: any) =>
        resolve({ data: table === 'event' ? events : forms, error: null });
      return q;
    }),
  };
  const service = new EventsService({ getAdminClient: () => admin } as any);
  return { service, calls, admin };
}

describe('EventsService.findAll client lookup through client_id', () => {
  it('fills the client from the intake form named by client_id when the event has no intake_form_id', async () => {
    const { service, calls } = serviceWith(
      [
        { id: 'e1', name: 'Gala', client_id: CLIENT, intake_form: null },
        { id: 'e2', name: 'No client', client_id: null, intake_form: null },
      ],
      [
        {
          id: CLIENT,
          contact_name: 'Ava Stone',
          contact_email: 'ava@example.com',
          contact_phone: '404-555-0101',
        },
      ],
    );
    const events: any[] = await service.findAll({} as any, OWNER);
    expect(events[0]).toMatchObject({
      clientName: 'Ava Stone',
      clientEmail: 'ava@example.com',
      clientPhone: '404-555-0101',
    });
    expect(events[1].clientName).toBeUndefined();
    expect(calls.in).toEqual([CLIENT]);
    // only the owner's own clients are ever read
    expect(calls.eq).toContainEqual(['user_id', OWNER]);
  });

  it('keeps the intake_form client when the event has one, and does not look anything up', async () => {
    const { service, admin } = serviceWith(
      [
        {
          id: 'e1',
          client_id: CLIENT,
          intake_form: {
            contact_name: 'From Join',
            contact_email: 'j@x.com',
            contact_phone: '1',
          },
        },
      ],
      [],
    );
    const events: any[] = await service.findAll({} as any, OWNER);
    expect(events[0].clientName).toBe('From Join');
    expect(admin.from).not.toHaveBeenCalledWith('intake_forms');
  });

  it('ignores a client_id that is not a UUID instead of breaking the query', async () => {
    const { service, admin } = serviceWith(
      [{ id: 'e1', client_id: 'not-a-uuid', intake_form: null }],
      [],
    );
    const events: any[] = await service.findAll({} as any, OWNER);
    expect(events).toHaveLength(1);
    expect(admin.from).not.toHaveBeenCalledWith('intake_forms');
  });

  it('leaves the client blank when the linked record no longer exists', async () => {
    const { service } = serviceWith(
      [{ id: 'e1', client_id: CLIENT, intake_form: null }],
      [],
    );
    const events: any[] = await service.findAll({} as any, OWNER);
    expect(events[0].clientName).toBeUndefined();
  });
});
