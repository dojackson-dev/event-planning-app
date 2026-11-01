import { nextMonthEndpoint, RestJsonConnector } from './rest-json.connector';
import { EventSourceRecord } from './connector.types';

const URL_MONTH =
  'https://real-time-events-search.p.rapidapi.com/search-events?query=events%20in%20Jackson%2C%20MS&date=month&is_virtual=false&start=0';

describe('nextMonthEndpoint', () => {
  it('stays on the current month early in the month', () => {
    expect(
      nextMonthEndpoint(URL_MONTH, new Date('2026-11-01T12:00:00Z')),
    ).toBeNull();
    expect(
      nextMonthEndpoint(URL_MONTH, new Date('2026-10-17T12:00:00Z')),
    ).toBeNull();
  });

  it('also asks for next month in the last two weeks', () => {
    const url = nextMonthEndpoint(URL_MONTH, new Date('2026-10-18T12:00:00Z'));
    expect(url).toContain('date=next_month');
    expect(url).not.toContain('date=month');
    expect(url).toContain('query=events%20in%20Jackson%2C%20MS');
    expect(
      nextMonthEndpoint(URL_MONTH, new Date('2026-10-31T23:00:00Z')),
    ).toContain('date=next_month');
  });

  it('ignores endpoints that are not a month window', () => {
    const late = new Date('2026-10-31T12:00:00Z');
    expect(
      nextMonthEndpoint('https://x.test/events?date=week', late),
    ).toBeNull();
    expect(nextMonthEndpoint('https://x.test/events', late)).toBeNull();
  });
});

describe('RestJsonConnector month-end window', () => {
  const source = {
    name: 'Jackson',
    endpoint_url: URL_MONTH,
    connector_config: {
      recordsPath: 'data',
      fieldMap: {
        externalId: 'event_id',
        title: 'name',
        eventDate: 'start_time',
      },
    },
  } as unknown as EventSourceRecord;

  const respond = (data: unknown[], ok = true) =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 504,
      statusText: ok ? 'OK' : 'Gateway Time-out',
      json: () => Promise.resolve({ data }),
    } as Response);

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('merges both windows without duplicates near month-end', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T12:00:00Z'));
    const spy = jest.spyOn(global, 'fetch').mockImplementation((url) =>
      String(url).includes('date=next_month')
        ? respond([
            { event_id: 'b', name: 'B', start_time: '2026-11-05 19:00:00' },
            { event_id: 'a', name: 'A', start_time: '2026-10-31 19:00:00' },
          ])
        : respond([
            { event_id: 'a', name: 'A', start_time: '2026-10-31 19:00:00' },
          ]),
    );
    const events = await new RestJsonConnector().fetch(source);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(events.map((e) => e.externalId).sort()).toEqual(['a', 'b']);
  });

  it('keeps the current month when the next-month call fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T12:00:00Z'));
    jest
      .spyOn(global, 'fetch')
      .mockImplementation((url) =>
        String(url).includes('date=next_month')
          ? respond([], false)
          : respond([
              { event_id: 'a', name: 'A', start_time: '2026-10-31 19:00:00' },
            ]),
      );
    const events = await new RestJsonConnector().fetch(source);
    expect(events).toHaveLength(1);
  });

  it('makes a single call early in the month', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-02T12:00:00Z'));
    const spy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        respond([
          { event_id: 'a', name: 'A', start_time: '2026-11-02 19:00:00' },
        ]),
      );
    await new RestJsonConnector().fetch(source);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
