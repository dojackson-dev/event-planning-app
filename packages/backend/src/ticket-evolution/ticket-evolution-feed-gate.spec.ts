import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { TicketEvolutionController } from './ticket-evolution.controller';
import { TicketEvolutionService } from './ticket-evolution.service';

function setup(opts: { feed?: string; configured?: boolean } = {}) {
  const getPublicEvents = jest.fn().mockResolvedValue([{ id: '1' }]);
  const service = {
    isConfigured: () => opts.configured ?? true,
    getPublicEvents,
    getPublicEventDetail: jest.fn().mockResolvedValue({ id: '1' }),
  } as unknown as TicketEvolutionService;
  const config = {
    get: (key: string) =>
      key === 'TICKET_EVOLUTION_PUBLIC_FEED' ? opts.feed : undefined,
  } as unknown as ConfigService;
  return new TicketEvolutionController(service, config);
}

const req = (origin: string) => ({ headers: { origin } }) as unknown as Request;

describe('TicketEvolutionController public feed gate', () => {
  it('serves dev origins by default', async () => {
    const ctrl = setup();
    expect(
      await ctrl.getPublicEvents(req('https://dev.eventecos.com')),
    ).toEqual([{ id: '1' }]);
  });

  it('serves production origins by default (live)', async () => {
    const ctrl = setup();
    expect(
      await ctrl.getPublicEvents(req('https://www.eventecos.com')),
    ).toEqual([{ id: '1' }]);
  });

  it('hides the feed from production origins when TICKET_EVOLUTION_PUBLIC_FEED=false', async () => {
    const ctrl = setup({ feed: 'false' });
    expect(
      await ctrl.getPublicEvents(req('https://www.eventecos.com')),
    ).toEqual([]);
    expect(
      await ctrl.getPublicEventDetail(req('https://www.eventecos.com'), 1),
    ).toBeNull();
    expect(
      await ctrl.getPublicEvents(req('https://dev.eventecos.com')),
    ).toEqual([{ id: '1' }]);
  });

  it('serves nothing when credentials are not configured', async () => {
    const ctrl = setup({ feed: 'true', configured: false });
    expect(
      await ctrl.getPublicEvents(req('https://dev.eventecos.com')),
    ).toEqual([]);
  });
});
