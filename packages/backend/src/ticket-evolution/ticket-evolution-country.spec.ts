import { ConfigService } from '@nestjs/config';
import { TicketEvolutionService } from './ticket-evolution.service';

function setup(countryCode?: string) {
  const config = {
    get: (key: string) =>
      key === 'TICKET_EVOLUTION_COUNTRY_CODE' ? countryCode : undefined,
  } as unknown as ConfigService;
  const service = new TicketEvolutionService(config);
  const internals = service as unknown as Record<string, jest.Mock>;
  internals.lookupWikipediaImage = jest.fn().mockResolvedValue(null);
  const request = jest.fn().mockResolvedValue({ events: [] });
  internals.request = request;
  const queryOf = () =>
    (request.mock.calls[0][2] as { query: Record<string, unknown> }).query;
  return { service, queryOf };
}

describe('Ticket Evolution public feed country', () => {
  it('only asks for US events by default', async () => {
    const { service, queryOf } = setup();
    await service.getPublicEvents();
    expect(queryOf().country_code).toBe('US');
  });

  it('keeps the country filter on searches and zip-code searches', async () => {
    const a = setup();
    await a.service.getPublicEvents({ name: 'rock' });
    expect(a.queryOf().country_code).toBe('US');
    const b = setup();
    await b.service.getPublicEvents({ zipCode: '39202', radiusMiles: 25 });
    expect(b.queryOf().country_code).toBe('US');
  });

  it('can be switched to another country, case-insensitively', async () => {
    const { service, queryOf } = setup(' ca ');
    await service.getPublicEvents();
    expect(queryOf().country_code).toBe('CA');
  });

  it('shows every country when the setting is left empty', async () => {
    const { service, queryOf } = setup('');
    await service.getPublicEvents();
    expect(queryOf().country_code).toBeUndefined();
  });

  it('sends the search text as the keyword query, not an exact-name match', async () => {
    const { service, queryOf } = setup();
    await service.getPublicEvents({ name: 'taylor swift' });
    expect(queryOf().q).toBe('taylor swift');
    expect(queryOf().name).toBeUndefined();
  });
});
