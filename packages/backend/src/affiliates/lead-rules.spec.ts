import { BadRequestException } from '@nestjs/common';
import {
  duplicateKeys,
  effectiveLeadType,
  mapLeadType,
  normalizeFollowUp,
  normalizeWebsite,
  parseLeadInput,
} from './lead-validation';
import { scoreLead } from './lead-scoring';
import { matchDuplicates } from './lead-duplicates';
import { CustomFieldDef, mergeCustomValues } from './lead-custom-fields';

describe('parseLeadInput', () => {
  it('trims and normalizes a full lead', () => {
    expect(
      parseLeadInput(
        {
          name: ' Jane Smith ',
          phone: '(404) 555-0123',
          business_name: ' Smith Catering ',
          email: ' Jane@Smith.com ',
          website: 'smithcatering.com',
          lead_type: 'caterer',
          source: 'referral',
          city: '',
        },
        { partial: false },
      ),
    ).toEqual({
      name: 'Jane Smith',
      phone: '(404) 555-0123',
      business_name: 'Smith Catering',
      email: 'jane@smith.com',
      website: 'https://smithcatering.com',
      lead_type: 'caterer',
      source: 'referral',
      city: null,
    });
  });

  it('requires a name and phone for a new lead but not for a partial edit', () => {
    expect(() =>
      parseLeadInput({ phone: '4045550123' }, { partial: false }),
    ).toThrow(BadRequestException);
    expect(() => parseLeadInput({ name: 'Jane' }, { partial: false })).toThrow(
      BadRequestException,
    );
    expect(parseLeadInput({ city: 'Macon' }, { partial: true })).toEqual({
      city: 'Macon',
    });
    expect(() => parseLeadInput({ name: '  ' }, { partial: true })).toThrow(
      BadRequestException,
    );
  });

  it.each([
    ['phone', { name: 'J', phone: '12345' }],
    ['phone letters', { name: 'J', phone: 'call me maybe' }],
    ['email', { name: 'J', phone: '4045550123', email: 'nope' }],
    ['type', { name: 'J', phone: '4045550123', lead_type: 'wizard' }],
    ['source', { name: 'J', phone: '4045550123', source: 'csv_import' }],
    [
      'follow-up',
      { name: 'J', phone: '4045550123', next_follow_up_at: 'soon' },
    ],
    ['non-text', { name: 'J', phone: '4045550123', city: 5 }],
    ['too long', { name: 'x'.repeat(121), phone: '4045550123' }],
  ])('rejects a bad %s', (_label, body) => {
    expect(() => parseLeadInput(body, { partial: false })).toThrow(
      BadRequestException,
    );
  });
});

describe('normalizeWebsite', () => {
  it('adds https and drops a bare trailing slash', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com');
    expect(normalizeWebsite('http://example.com/menu')).toBe(
      'http://example.com/menu',
    );
    expect(normalizeWebsite('')).toBeNull();
  });

  it.each(['javascript:alert(1)', 'ftp://example.com', 'localhost', 'a b.com'])(
    'rejects %s',
    (value) => {
      expect(() => normalizeWebsite(value)).toThrow(BadRequestException);
    },
  );
});

describe('normalizeFollowUp', () => {
  it('accepts dates and datetimes and clears on empty', () => {
    expect(normalizeFollowUp('2026-12-01')).toBe('2026-12-01T12:00:00.000Z');
    expect(normalizeFollowUp('2026-12-01T15:30:00Z')).toBe(
      '2026-12-01T15:30:00.000Z',
    );
    expect(normalizeFollowUp('')).toBeNull();
    expect(normalizeFollowUp(null)).toBeNull();
  });
});

describe('lead types', () => {
  it('maps free text from spreadsheets', () => {
    expect(mapLeadType('Catering')).toBe('caterer');
    expect(mapLeadType('Wedding planner')).toBe('event_owner');
    expect(mapLeadType('Event rentals')).toBe('vendor');
    expect(mapLeadType('Banquet hall')).toBe('venue_owner');
    expect(mapLeadType('Event Owner')).toBe('event_owner');
    expect(mapLeadType('Plumber')).toBe('other');
    expect(mapLeadType('')).toBeNull();
  });

  it('derives a type for demo-form leads from their roles', () => {
    expect(effectiveLeadType(null, ['promoter', 'artist'])).toBe('promoter');
    expect(effectiveLeadType('caterer', ['promoter'])).toBe('caterer');
    expect(effectiveLeadType(null, [])).toBeNull();
  });
});

describe('duplicates', () => {
  it('builds keys that match the database columns', () => {
    expect(
      duplicateKeys({
        phone: '+1 (404) 555-0123',
        email: ' Jane@Smith.com ',
        business_name: ' Smith Catering ',
      }),
    ).toEqual({
      phone: '4045550123',
      email: 'jane@smith.com',
      business: 'smith catering',
    });
    expect(duplicateKeys({ phone: '123' }).phone).toBeNull();
  });

  it('reports why leads match and ignores the lead being edited', () => {
    const base = {
      name: 'A',
      business_name: null,
      status: 'new',
      claimed_by_affiliate_id: null,
      phone_digits: null,
      email_key: null,
      business_key: null,
    };
    const rows = [
      { ...base, id: '1', phone_digits: '4045550123' },
      { ...base, id: '2', email_key: 'jane@smith.com', business_key: 'smith' },
      { ...base, id: '3' },
    ];
    const keys = {
      phone: '4045550123',
      email: 'jane@smith.com',
      business: 'smith',
    };
    expect(
      matchDuplicates(rows, keys).map((m) => [m.row.id, m.reasons]),
    ).toEqual([
      ['1', ['phone']],
      ['2', ['email', 'business']],
    ]);
    expect(matchDuplicates(rows, keys, '1')).toHaveLength(1);
  });
});

describe('scoreLead', () => {
  const base = {
    lead_type: null,
    source: 'manual',
    business_name: null,
    email: null,
    website: null,
    city: null,
    description: null,
    status: 'claimed',
    created_at: '2026-11-01T00:00:00Z',
  };
  const now = Date.parse('2026-11-05T00:00:00Z');

  it('ranks a recent demo request from an event owner as hot', () => {
    const result = scoreLead(
      {
        ...base,
        lead_type: 'event_owner',
        source: 'demo_request',
        business_name: 'X',
        email: 'a@b.co',
      },
      now,
    );
    expect(result.label).toBe('hot');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('puts a bare cold-list entry low and a complete caterer in the middle', () => {
    expect(scoreLead({ ...base, lead_type: 'artist' }, now).label).toBe('cold');
    expect(
      scoreLead(
        {
          ...base,
          lead_type: 'caterer',
          business_name: 'X',
          email: 'a@b.co',
          city: 'Atlanta',
        },
        now,
      ).label,
    ).toBe('warm');
  });

  it('scores closed leads by outcome and never exceeds 100', () => {
    expect(scoreLead({ ...base, status: 'won' }, now).score).toBe(100);
    expect(
      scoreLead({ ...base, status: 'lost', lead_type: 'caterer' }, now).score,
    ).toBe(0);
    expect(
      scoreLead(
        {
          ...base,
          lead_type: 'vendor',
          source: 'demo_request',
          business_name: 'X',
          email: 'a@b.co',
          website: 'https://x.co',
          city: 'A',
          description: 'd',
          status: 'contacted',
        },
        now,
      ).score,
    ).toBeLessThanOrEqual(100);
  });
});

describe('mergeCustomValues', () => {
  const defs: CustomFieldDef[] = [
    {
      id: '1',
      field_key: 'guests',
      label: 'Guests',
      field_type: 'number',
      options: [],
      sort_order: 0,
    },
    {
      id: '2',
      field_key: 'stage',
      label: 'Stage',
      field_type: 'select',
      options: ['Cold', 'Warm'],
      sort_order: 1,
    },
    {
      id: '3',
      field_key: 'event_date',
      label: 'Event date',
      field_type: 'date',
      options: [],
      sort_order: 2,
    },
    {
      id: '4',
      field_key: 'venue',
      label: 'Venue',
      field_type: 'text',
      options: [],
      sort_order: 3,
    },
  ];

  it('validates by type and merges with what is already saved', () => {
    expect(
      mergeCustomValues(
        { venue: 'Old Hall' },
        { guests: '150', stage: 'Warm', event_date: '2026-12-01' },
        defs,
      ),
    ).toEqual({
      venue: 'Old Hall',
      guests: 150,
      stage: 'Warm',
      event_date: '2026-12-01',
    });
  });

  it('clears a value when it is emptied', () => {
    expect(
      mergeCustomValues({ venue: 'Old Hall' }, { venue: '' }, defs),
    ).toEqual({});
  });

  it.each([
    [{ missing: 'x' }],
    [{ guests: 'many' }],
    [{ stage: 'Hot' }],
    [{ event_date: '12/01/2026' }],
    [{ venue: 'x'.repeat(501) }],
  ])('rejects %j', (submitted) => {
    expect(() => mergeCustomValues({}, submitted, defs)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a non-object', () => {
    expect(() => mergeCustomValues({}, 'nope', defs)).toThrow(
      BadRequestException,
    );
    expect(() => mergeCustomValues({}, null, defs)).toThrow(
      BadRequestException,
    );
  });
});
