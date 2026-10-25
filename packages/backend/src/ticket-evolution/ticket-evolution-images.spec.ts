import { ConfigService } from '@nestjs/config';
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
