import { ConfigService } from '@nestjs/config';
import { TicketEvolutionService } from './ticket-evolution.service';

function setup(pinned?: string) {
  const config = {
    get: (key: string) =>
      key === 'TICKET_EVOLUTION_PINNED_EVENT_IDS' ? pinned : undefined,
  } as unknown as ConfigService;
  const service = new TicketEvolutionService(config);
  const internals = service as unknown as Record<string, jest.Mock>;
  internals.lookupWikipediaImage = jest.fn().mockResolvedValue(null);
  internals.request = jest.fn((_method: string, path: string) => {
    if (path === '/v9/events/982605') {
      return Promise.resolve({
        id: 982605,
        name: 'Test Event (Test Purchases Only)',
        occurs_at: '2027-03-12T09:30:00Z',
      });
    }
    if (path === '/v9/events/982604') {
      return Promise.resolve({
        id: 982604,
        name: 'Test Event Taxable (Test Purchases Only)',
        occurs_at: '2027-03-26T09:30:00Z',
      });
    }
    if (path.startsWith('/v9/events/')) {
      return Promise.reject(new Error('not found'));
    }
    return Promise.resolve({
      events: [
        { id: 111, name: 'Real Show', occurs_at: '2026-11-01T20:00:00Z' },
        { id: 982605, name: 'Dup', occurs_at: '2027-03-12T09:30:00Z' },
      ],
    });
  });
  return service;
}

const ids = (events: Array<{ id: string }>) => events.map((e) => e.id);

describe('Ticket Evolution pinned test events', () => {
  it('pins nothing by default', async () => {
    expect(ids(await setup().getPublicEvents())).toEqual(['111', '982605']);
  });

  it('puts the configured events first on the unfiltered first page', async () => {
    const events = await setup('982605,982604').getPublicEvents();
    expect(ids(events)).toEqual(['982605', '982604', '111']);
  });

  it('does not pin on later pages or filtered searches', async () => {
    const service = setup('982605,982604');
    expect(ids(await service.getPublicEvents({ page: 2 }))).toEqual([
      '111',
      '982605',
    ]);
    expect(ids(await service.getPublicEvents({ name: 'show' }))).toEqual([
      '111',
      '982605',
    ]);
  });

  it('can be changed or turned off with TICKET_EVOLUTION_PINNED_EVENT_IDS', async () => {
    expect(ids(await setup('982604').getPublicEvents())).toEqual([
      '982604',
      '111',
      '982605',
    ]);
    expect(ids(await setup('').getPublicEvents())).toEqual(['111', '982605']);
  });

  it('skips pinned events that cannot be loaded', async () => {
    expect(ids(await setup('999,982604').getPublicEvents())).toEqual([
      '982604',
      '111',
      '982605',
    ]);
  });
});
