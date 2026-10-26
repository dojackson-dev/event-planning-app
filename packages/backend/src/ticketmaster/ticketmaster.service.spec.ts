import { ConfigService } from '@nestjs/config';
import { TicketmasterService } from './ticketmaster.service';

function setup(env: Record<string, string | undefined>) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ _embedded: { events: [] } }),
  });
  (global as any).fetch = fetchMock;
  const service = new TicketmasterService(config);
  const urlOf = () => new URL(fetchMock.mock.calls[0][0] as string);
  return { service, fetchMock, urlOf };
}

describe('Ticketmaster search', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns nothing, without calling Ticketmaster, when no API key is set', async () => {
    const { service, fetchMock } = setup({});
    await expect(service.searchEvents({})).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limits a nationwide search (no zip) to US events by default', async () => {
    const { service, urlOf } = setup({ TICKETMASTER_API_KEY: 'k' });
    await service.searchEvents({ keyword: 'rock' });
    const url = urlOf();
    expect(url.searchParams.get('countryCode')).toBe('US');
    expect(url.searchParams.get('latlong')).toBeNull();
    expect(url.searchParams.get('radius')).toBeNull();
    expect(url.searchParams.get('keyword')).toBe('rock');
  });

  it('can be switched to another country, case-insensitively', async () => {
    const { service, urlOf } = setup({
      TICKETMASTER_API_KEY: 'k',
      TICKETMASTER_COUNTRY_CODE: ' ca ',
    });
    await service.searchEvents({});
    expect(urlOf().searchParams.get('countryCode')).toBe('CA');
  });

  it('shows every country when the setting is left empty', async () => {
    const { service, urlOf } = setup({
      TICKETMASTER_API_KEY: 'k',
      TICKETMASTER_COUNTRY_CODE: '',
    });
    await service.searchEvents({});
    expect(urlOf().searchParams.has('countryCode')).toBe(false);
  });

  it('still applies the date range and paging', async () => {
    const { service, urlOf } = setup({ TICKETMASTER_API_KEY: 'k' });
    await service.searchEvents({
      date_from: '2099-12-01',
      date_to: '2099-12-31',
      page: 2,
    });
    const url = urlOf();
    expect(url.searchParams.get('startDateTime')).toBe('2099-12-01T00:00:00Z');
    expect(url.searchParams.get('endDateTime')).toBe('2099-12-31T23:59:59Z');
    expect(url.searchParams.get('page')).toBe('2');
  });
});
