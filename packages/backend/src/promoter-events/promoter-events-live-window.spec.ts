import { PromoterEventsService } from './promoter-events.service';

/** Records the date cutoff the public list applies, and returns no rows. */
function listing(failFirstWithEndDate = false) {
  const gte: Array<[string, string]> = [];
  const or: string[] = [];
  let failed = 0;
  const q: any = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'not', 'lte', 'range']) {
    q[m] = () => q;
  }
  q.gte = (col: string, val: string) => {
    gte.push([col, val]);
    return q;
  };
  q.or = (filter: string) => {
    or.push(filter);
    return q;
  };
  q.then = (resolve: (v: unknown) => void) =>
    resolve(
      failFirstWithEndDate && or.length > 0 && !failed++
        ? {
            data: null,
            error: { message: 'column public_events.end_date does not exist' },
          }
        : { data: [], error: null },
    );
  const admin = { from: () => q };
  const service = new PromoterEventsService(
    { getAdminClient: () => admin } as any,
    { get: () => 'sk_test_dummy' } as any,
    {} as any,
    {} as any,
  );
  return { service, gte, or };
}

describe('public event list cutoff', () => {
  afterEach(() => jest.useRealTimers());

  it('still lists an event dated today at 8pm Central, when the UTC date is already tomorrow', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-15T02:00:00Z') });
    const { service, or } = listing();
    await service.listPublicEvents();
    expect(or).toContain('event_date.gte.2026-11-14,end_date.gte.2026-11-14');
  });

  it('lets a caller-provided later date_from narrow the list', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-14T18:00:00Z') });
    const { service, or } = listing();
    await service.listPublicEvents(undefined, undefined, 30, '2026-12-01');
    expect(or).toContain('event_date.gte.2026-12-01,end_date.gte.2026-12-01');
  });

  it('keeps listing by start date until the multi-day migration has been run', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-11-14T18:00:00Z') });
    const { service, gte } = listing(true);
    await service.listPublicEvents();
    expect(gte).toContainEqual(['event_date', '2026-11-14']);
  });
});
