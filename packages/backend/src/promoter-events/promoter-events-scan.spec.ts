import { PromoterEventsService } from './promoter-events.service';

const TICKET_ID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

/** Records which ticket id the door scan looked up, and answers only for the real one. */
function scanner() {
  const lookedUp: string[] = [];
  const updated: string[] = [];
  const from = (table: string) => {
    const q: any = {};
    let patch: unknown;
    q.select = () => q;
    q.update = (p: unknown) => {
      patch = p;
      return q;
    };
    q.eq = (col: string, val: string) => {
      if (table === 'tickets' && col === 'id') lookedUp.push(val);
      if (patch !== undefined && col === 'id') updated.push(val);
      return q;
    };
    q.maybeSingle = () => {
      if (table === 'public_events')
        return Promise.resolve({ data: { id: 'e1' } });
      const id = lookedUp[lookedUp.length - 1];
      return Promise.resolve({
        data:
          id === TICKET_ID
            ? {
                id,
                status: 'valid',
                public_event_id: 'e1',
                ticket_tiers: { name: 'GA' },
              }
            : null,
      });
    };
    q.then = (resolve: (v: unknown) => void) => resolve({ error: null });
    return q;
  };
  const service = new PromoterEventsService(
    { getAdminClient: () => ({ from }) } as any,
    { get: () => 'sk_test_dummy' } as any,
    {} as any,
    {} as any,
  );
  (service as any).getPromoterAccount = () => Promise.resolve({ id: 'p1' });
  return { service, lookedUp, updated };
}

describe('door scan accepts what the ticket QR contains', () => {
  it('checks in a ticket scanned by its id', async () => {
    const { service, updated } = scanner();
    const result = await service.scanTicket('u1', 'e1', TICKET_ID);
    expect(result.valid).toBe(true);
    expect(updated).toEqual([TICKET_ID]);
  });

  it('checks in a ticket scanned from the link in the emailed QR', async () => {
    const { service, lookedUp, updated } = scanner();
    const result = await service.scanTicket(
      'u1',
      'e1',
      `https://www.eventecos.com/ticket/${TICKET_ID}`,
    );
    expect(result.valid).toBe(true);
    expect(lookedUp.length).toBeGreaterThan(0);
    expect(lookedUp.every((id) => id === TICKET_ID)).toBe(true);
    expect(updated).toEqual([TICKET_ID]);
  });

  it('still reports a ticket that is not for this event', async () => {
    const { service } = scanner();
    await expect(
      service.scanTicket('u1', 'e1', 'https://www.eventecos.com/ticket/nope'),
    ).rejects.toThrow('Ticket not found for this event');
  });
});
