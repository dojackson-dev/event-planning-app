import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IrsLookupService } from './irs-lookup.service';
import { NonprofitService } from './nonprofit.service';

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('IrsLookupService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  const org = (over: Record<string, unknown>) => ({
    organization: {
      name: 'Helping Hands',
      subsection_code: 3,
      exempt_organization_status_code: 1,
      deductibility_code: 1,
      ruling_date: '2001-05-01',
      ...over,
    },
  });

  it('treats an active 501(c)(3) as eligible', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, org({}))) as unknown as typeof fetch;
    const r = await new IrsLookupService().lookup('123456789');
    expect(r).toMatchObject({ found: true, eligible: true, reason: null });
  });

  it('rejects a non-501(c)(3)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, org({ subsection_code: 4 })),
      ) as unknown as typeof fetch;
    const r = await new IrsLookupService().lookup('123456789');
    expect(r).toMatchObject({ found: true, eligible: false });
  });

  it('rejects an organization without active exempt status', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, org({ exempt_organization_status_code: 2 })),
      ) as unknown as typeof fetch;
    const r = await new IrsLookupService().lookup('123456789');
    expect(r).toMatchObject({ found: true, eligible: false });
  });

  it('reports a placeholder (unknown EIN) as not found', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(200, { organization: { name: 'Unknown Organization' } }),
      ) as unknown as typeof fetch;
    expect(await new IrsLookupService().lookup('999999999')).toMatchObject({
      found: false,
    });
  });

  it('throws when the lookup service is down', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(500)) as unknown as typeof fetch;
    await expect(new IrsLookupService().lookup('123456789')).rejects.toThrow(
      /unavailable/,
    );
  });
});

describe('NonprofitService.verify', () => {
  function setup(opts: {
    taken?: boolean;
    lookup?: unknown;
    lookupError?: Error;
  }) {
    const update = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const promoter = {
      id: 'p1',
      is_nonprofit: false,
      nonprofit_ein: null,
      nonprofit_legal_name: null,
      nonprofit_status: 'unverified',
      nonprofit_verified_at: null,
      nonprofit_check: null,
    };
    // Query builder: every filter returns itself; terminal maybeSingle()
    // answers the promoter lookup first and the EIN-conflict lookup second.
    let maybeSingleCalls = 0;
    const builder: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'neq']) {
      builder[m] = jest.fn().mockReturnValue(builder);
    }
    builder.maybeSingle = jest.fn().mockImplementation(() => {
      maybeSingleCalls += 1;
      return Promise.resolve({
        data:
          maybeSingleCalls % 2 === 1
            ? promoter
            : opts.taken
              ? { id: 'other' }
              : null,
      });
    });
    builder.update = update;
    const supabase = {
      getAdminClient: () => ({ from: () => builder }),
    } as unknown as SupabaseService;
    const irs = {
      lookup: opts.lookupError
        ? jest.fn().mockRejectedValue(opts.lookupError)
        : jest.fn().mockResolvedValue(opts.lookup),
    } as unknown as IrsLookupService;
    return { service: new NonprofitService(supabase, irs), update, irs };
  }

  const good = {
    found: true,
    eligible: true,
    reason: null,
    name: 'Helping Hands',
  };

  it('rejects a malformed EIN before calling the IRS', async () => {
    const { service, irs } = setup({ lookup: good });
    await expect(
      service.verify('u1', { ein: '12-345' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(irs.lookup).not.toHaveBeenCalled();
  });

  it('marks an eligible organization verified with the normalized EIN', async () => {
    const { service, update } = setup({ lookup: good });
    await service.verify('u1', { ein: '12-3456789' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_nonprofit: true,
        nonprofit_ein: '123456789',
        nonprofit_status: 'verified',
        nonprofit_legal_name: 'Helping Hands',
      }),
    );
  });

  it('marks an ineligible organization rejected', async () => {
    const { service, update } = setup({
      lookup: {
        found: true,
        eligible: false,
        reason: 'Organization is not a 501(c)(3).',
        name: 'Club',
      },
    });
    await service.verify('u1', { ein: '123456789' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        nonprofit_status: 'rejected',
        nonprofit_verified_at: null,
      }),
    );
  });

  it('refuses an EIN already verified on another account', async () => {
    const { service, irs } = setup({ lookup: good, taken: true });
    await expect(
      service.verify('u1', { ein: '123456789' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(irs.lookup).not.toHaveBeenCalled();
  });

  it('returns 503 when the IRS lookup is unavailable', async () => {
    const { service, update } = setup({
      lookupError: new Error('IRS lookup is unavailable right now.'),
    });
    await expect(
      service.verify('u1', { ein: '123456789' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(update).not.toHaveBeenCalled();
  });
});
