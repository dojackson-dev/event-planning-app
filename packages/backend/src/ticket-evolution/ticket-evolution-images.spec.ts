import { ConfigService } from '@nestjs/config';
import { TicketmasterService } from '../ticketmaster/ticketmaster.service';
import { TicketEvolutionService } from './ticket-evolution.service';

type ImageLookup = (query: string) => Promise<string | null>;

function setup() {
  const service = new TicketEvolutionService({
    get: () => undefined,
  } as unknown as ConfigService);
  const lookup = (
    service as unknown as { lookupWikipediaImage: ImageLookup }
  ).lookupWikipediaImage.bind(service);
  return lookup;
}

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('TicketEvolutionService Wikipedia image lookup', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('sends a descriptive User-Agent and caches hits', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { thumbnail: { source: 'https://img/a.jpg' } }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const lookup = setup();

    expect(await lookup('Hayes Carll')).toBe('https://img/a.jpg');
    expect(await lookup('hayes carll')).toBe('https://img/a.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(init.headers['User-Agent']).toContain('EventEcos');
  });

  it('retries once when throttled with 429', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(429))
      .mockResolvedValueOnce(
        jsonResponse(200, { originalimage: { source: 'https://img/b.jpg' } }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await setup()('Kevin Gates')).toBe('https://img/b.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caches a 404 miss but not a throttled failure for long', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(404));
    global.fetch = fetchMock as unknown as typeof fetch;
    const lookup = setup();

    expect(await lookup('Nobody Known')).toBeNull();
    expect(await lookup('Nobody Known')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('TicketEvolutionService Ticketmaster image fallback', () => {
  type TmLookup = (
    names: string[],
    date: string | null,
  ) => Promise<string | null>;

  function setupTm(events: Array<Record<string, unknown>>) {
    const searchEvents = jest.fn().mockResolvedValue(events);
    const service = new TicketEvolutionService(
      { get: () => undefined } as unknown as ConfigService,
      { searchEvents } as unknown as TicketmasterService,
    );
    const lookup = (
      service as unknown as { findTicketmasterImage: TmLookup }
    ).findTicketmasterImage.bind(service);
    return { lookup, searchEvents };
  }

  it('uses the image of a same-date Ticketmaster event with a matching name', async () => {
    const { lookup, searchEvents } = setupTm([
      { title: 'Other Show', event_date: '2026-10-31', image_url: 'x' },
      {
        title: "It's A 2000's Halloween Party: Jackson",
        event_date: '2026-10-31',
        image_url: 'https://tm/img.jpg',
      },
    ]);
    const image = await lookup(['Its a 2000s (Halloween) Party'], '2026-10-31');
    expect(image).toBe('https://tm/img.jpg');
    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        date_from: '2026-10-30',
        date_to: '2026-11-01',
      }),
    );
  });

  it('ignores a name match more than a day away', async () => {
    const { lookup } = setupTm([
      {
        title: 'Wax Monkey',
        event_date: '2026-11-03',
        image_url: 'https://tm/w.jpg',
      },
    ]);
    expect(await lookup(['Wax Monkey'], '2026-10-31')).toBeNull();
  });

  it('accepts a match one day off', async () => {
    const { lookup } = setupTm([
      {
        title: 'Pothole Paradise, Wax Monkey',
        event_date: '2026-11-20',
        image_url: 'https://tm/w.jpg',
      },
    ]);
    expect(await lookup(['Wax Monkey'], '2026-11-21')).toBe('https://tm/w.jpg');
  });

  it('returns null without Ticketmaster configured', async () => {
    const service = new TicketEvolutionService({
      get: () => undefined,
    } as unknown as ConfigService);
    const lookup = (
      service as unknown as { findTicketmasterImage: TmLookup }
    ).findTicketmasterImage.bind(service);
    expect(await lookup(['Anything'], '2026-10-31')).toBeNull();
  });
});
