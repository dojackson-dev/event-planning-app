import { BadRequestException } from '@nestjs/common';
import { buildCsv, parseCsv, parseLeadCsv, safeCsvCell } from './lead-csv';
import { LeadImportExportService } from './lead-import-export.service';
import type { LeadsService } from './leads.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { CustomFieldDef } from './lead-custom-fields';

const defs: CustomFieldDef[] = [
  {
    id: '1',
    field_key: 'guests',
    label: 'Guest Count',
    field_type: 'number',
    options: [],
    sort_order: 0,
  },
];

describe('parseCsv', () => {
  it('handles quotes, commas, escaped quotes, CRLF and a BOM', () => {
    const text =
      '\uFEFFName,Notes\r\n"Smith, Jane","She said ""call back"""\r\nBob,\r\n';
    expect(parseCsv(text)).toEqual([
      ['Name', 'Notes'],
      ['Smith, Jane', 'She said "call back"'],
      ['Bob', ''],
    ]);
  });

  it('keeps line breaks inside quoted cells and skips blank lines', () => {
    expect(parseCsv('a,b\n"x\ny",z\n\n')).toEqual([
      ['a', 'b'],
      ['x\ny', 'z'],
    ]);
  });

  it('rejects an unclosed quote', () => {
    expect(() => parseCsv('a,b\n"oops,1')).toThrow(BadRequestException);
  });
});

describe('buildCsv', () => {
  it('quotes cells and neutralizes spreadsheet formulas but keeps +1 phone numbers', () => {
    expect(safeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(safeCsvCell('@cmd')).toBe(`'@cmd`);
    expect(safeCsvCell('+1 (404) 555-0123', true)).toBe('+1 (404) 555-0123');
    expect(safeCsvCell('+cmd', true)).toBe(`'+cmd`);
    expect(buildCsv(['A', 'B'], [['x,y', 1]])).toBe('A,B\r\n"x,y",1\r\n');
  });

  it('round-trips through the parser', () => {
    const csv = buildCsv(['Name', 'Phone'], [['Smith, "Jane"', '4045550123']]);
    expect(parseCsv(csv)).toEqual([
      ['Name', 'Phone'],
      ['Smith, "Jane"', '4045550123'],
    ]);
  });
});

describe('parseLeadCsv', () => {
  it('maps common headers, custom fields and business-only rows', () => {
    const csv = [
      'Company,Contact Name,Mobile,E-mail,Industry,Guest Count,Website',
      'Smith Catering,Jane Smith,(404) 555-0123,JANE@smith.com,Catering,150,smith.com',
      'Bayou Events,,404-555-0999,,Event planner,,',
    ].join('\n');
    const { rows, errors } = parseLeadCsv(csv, defs);
    expect(errors).toEqual([]);
    expect(rows[0].input).toMatchObject({
      name: 'Jane Smith',
      business_name: 'Smith Catering',
      email: 'jane@smith.com',
      lead_type: 'caterer',
      website: 'https://smith.com',
      source: 'csv_import',
    });
    expect(rows[0].custom).toEqual({ guests: '150' });
    expect(rows[1].input).toMatchObject({
      name: 'Bayou Events',
      lead_type: 'event_owner',
    });
  });

  it('reports a reason per unusable row and keeps the good ones', () => {
    const csv =
      'Name,Phone,Email\nJane,4045550123,jane@x.com\nBob,123,\nAmy,4045550111,bad\n,4045550222,';
    const { rows, errors } = parseLeadCsv(csv, []);
    expect(rows).toHaveLength(1);
    expect(errors.map((e) => e.row)).toEqual([3, 4, 5]);
  });

  it('requires name and phone columns, and a data row', () => {
    expect(() => parseLeadCsv('Name,Email\nJane,j@x.com', [])).toThrow(
      BadRequestException,
    );
    expect(() => parseLeadCsv('Name,Phone', [])).toThrow(BadRequestException);
  });
});

describe('LeadImportExportService.importCsv', () => {
  const agent = { id: 'agent-me', email: 'agent@x.com' };
  const manager = { id: 'agent-mgr', email: 'sales@eventecos.com' };
  const csv = [
    'Name,Phone,Business,Email',
    'Jane,(404) 555-0123,Smith Catering,jane@smith.com',
    'Jane Again,404-555-0123,Other Name,',
    'Bob,404-555-0999,Existing Co,',
    'Sam,404-555-0777,Sam Events,sam@events.com',
    'Sam Dup,404-555-0888,sam events,',
    'Bad,12,,',
  ].join('\n');
  const file = (content = csv) => ({
    originalname: 'leads.csv',
    mimetype: 'text/csv',
    size: Buffer.byteLength(content),
    buffer: Buffer.from(content),
  });

  function setup() {
    const inserted: Array<Record<string, unknown>> = [];
    const leads = {
      duplicateIndex: jest.fn(() =>
        Promise.resolve([
          {
            id: 'existing',
            name: 'Bob B',
            business_name: 'Existing Co',
            status: 'new',
            claimed_by_affiliate_id: null,
            phone_digits: '4045550999',
            email_key: null,
            business_key: 'existing co',
          },
        ]),
      ),
      resolveOwner: jest.fn((a: { id: string; email: string }, to: string) =>
        Promise.resolve(
          a.email === 'sales@eventecos.com' && to === 'pool' ? null : a.id,
        ),
      ),
      buildInsert: jest.fn((input, options) => ({
        ...input,
        owner: options.ownerId,
      })),
      insertMany: jest.fn((rows: Array<Record<string, unknown>>) => {
        inserted.push(...rows);
        return Promise.resolve(rows.length);
      }),
      listAgents: jest.fn(),
    };
    const supabase = {
      getAdminClient: () => ({
        from: () => {
          const query: Record<string, unknown> = {};
          query.select = () => query;
          query.order = () => query;
          query.then = (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: defs }).then(resolve);
          return query;
        },
      }),
    };
    const service = new LeadImportExportService(
      supabase as unknown as SupabaseService,
      leads as unknown as LeadsService,
    );
    return { service, leads, inserted };
  }

  it('skips leads that already exist or repeat inside the file, and reports bad rows', async () => {
    const { service, inserted } = setup();
    const summary = await service.importCsv(agent, file(), { dryRun: false });
    expect(summary).toMatchObject({
      total: 6,
      imported: 2,
      duplicates: 3,
      invalid: 1,
      dry_run: false,
    });
    expect(summary.duplicate_details.map((d) => [d.row, d.reasons])).toEqual([
      [3, ['phone']],
      [4, ['phone', 'business']],
      [6, ['business']],
    ]);
    expect(summary.errors).toEqual([
      { row: 7, reason: 'Enter a valid phone number.' },
    ]);
    expect(inserted.map((r) => r.name)).toEqual(['Jane', 'Sam']);
  });

  it('saves nothing on a dry run', async () => {
    const { service, leads } = setup();
    const summary = await service.importCsv(agent, file(), { dryRun: true });
    expect(summary.imported).toBe(2);
    expect(leads.insertMany).not.toHaveBeenCalled();
  });

  it('always imports for the agent themselves, but lets the manager use the pool', async () => {
    const mine = setup();
    await mine.service.importCsv(agent, file(), {
      dryRun: false,
      assignTo: 'pool',
    });
    expect(mine.inserted.every((r) => r.owner === agent.id)).toBe(true);

    const pool = setup();
    await pool.service.importCsv(manager, file(), { dryRun: false });
    expect(pool.inserted.every((r) => r.owner === null)).toBe(true);
  });

  it('spreads leads across agents for round robin', async () => {
    const { service, leads, inserted } = setup();
    leads.listAgents.mockResolvedValue({
      agents: [
        { id: 'a1', name: 'A', email: 'a1@x.com' },
        { id: 'a2', name: 'B', email: 'a2@x.com' },
        { id: 'm', name: 'M', email: 'sales@eventecos.com' },
      ],
    });
    await service.importCsv(manager, file(), {
      dryRun: false,
      assignTo: 'round_robin',
    });
    expect(inserted.map((r) => r.owner)).toEqual(['a1', 'a2']);
  });

  it('rejects missing, oversized and non-CSV uploads', async () => {
    const { service } = setup();
    await expect(
      service.importCsv(agent, undefined, { dryRun: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.importCsv(
        agent,
        { ...file(), originalname: 'leads.exe' },
        { dryRun: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.importCsv(
        agent,
        { ...file(), size: 2 * 1024 * 1024 },
        { dryRun: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
