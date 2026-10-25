import { ConfigService } from '@nestjs/config';
import { TicketEvolutionService } from './ticket-evolution.service';

function setup(checkoutBase?: string) {
  const config = {
    get: (key: string) =>
      key === 'TICKET_EVOLUTION_CHECKOUT_BASE_URL' ? checkoutBase : undefined,
  } as unknown as ConfigService;
  const service = new TicketEvolutionService(config);
  const internals = service as unknown as Record<string, jest.Mock>;
  internals.lookupWikipediaImage = jest.fn().mockResolvedValue(null);
  internals.request = jest.fn(async (_method: string, path: string) => {
    if (path === '/v9/listings') {
      return {
        ticket_groups: [
          {
            id: 4749803604,
            section: 'REAR RIGHT',
            row: 'W',
            quantity: 4,
            retail_price: 23.62,
            retail_price_inclusive: 27.5,
          },
        ],
      };
    }
    if (path.startsWith('/v9/events/')) {
      return {
        id: 982605,
        name: 'Test Event',
        occurs_at: '2027-03-12T09:30:00Z',
      };
    }
    return {
      events: [
        {
          id: 982605,
          name: 'Test Event',
          url: '/events/982605',
          occurs_at: '2027-03-12T09:30:00Z',
        },
      ],
    };
  });
  return service;
}

describe('Ticket Evolution Hosted Checkout links', () => {
  it('links each listing to checkout using the event and ticket group IDs', async () => {
    const detail = await setup(
      'https://checkout.eventecos.com',
    ).getPublicEventDetail(982605);
    expect(detail.listings[0].checkout_url).toBe(
      'https://checkout.eventecos.com/checkout/payment/982605/4749803604',
    );
  });

  it('tolerates a trailing slash on the configured checkout domain', async () => {
    const detail = await setup(
      'https://checkout.eventecos.com/',
    ).getPublicEventDetail(982605);
    expect(detail.listings[0].checkout_url).toBe(
      'https://checkout.eventecos.com/checkout/payment/982605/4749803604',
    );
  });

  it('shows the all-in price (retail_price_inclusive) to buyers', async () => {
    const detail = await setup(undefined).getPublicEventDetail(982605);
    expect(detail.listings[0].retail_price).toBe(27.5);
  });

  it('falls back to the EventEcos checkout domain when none is configured', async () => {
    const detail = await setup(undefined).getPublicEventDetail(982605);
    expect(detail.listings[0].checkout_url).toBe(
      'https://checkout.eventecos.com/checkout/payment/982605/4749803604',
    );
  });

  it('no longer emits an event-level checkout URL on the event list', async () => {
    const events = await setup(
      'https://checkout.eventecos.com',
    ).getPublicEvents();
    expect(events[0]).toMatchObject({ id: '982605', event_url: null });
  });
});
