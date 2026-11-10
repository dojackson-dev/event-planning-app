import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OutreachService, parseOutreachRequest } from './outreach.service';
import { applyTokens, renderOutreach } from './outreach-templates';
import {
  unsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from './outreach-unsubscribe';
import type { MailService } from '../mail/mail.service';
import type { SupabaseService } from '../supabase/supabase.service';

const LEAD = '11111111-1111-4111-8111-111111111111';
const LEAD_2 = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const agent = {
  id: 'agent-me',
  email: 'agent@x.com',
  first_name: 'Sam',
  last_name: 'Rep',
};
const manager = {
  id: 'agent-mgr',
  email: 'sales@eventecos.com',
  first_name: 'Sales',
  last_name: 'Manager',
};

beforeAll(() => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.OUTREACH_UNSUBSCRIBE_SECRET = 'test-secret';
  process.env.FRONTEND_URL = 'https://www.eventecos.com';
  process.env.OUTREACH_POSTAL_ADDRESS = '100 Main St, Atlanta, GA 30303';
  delete process.env.OUTREACH_DAILY_LIMIT;
});

describe('renderOutreach', () => {
  const base = {
    subject: 'Hello {{firstName}}',
    recipient: { name: 'Jane Smith', business: 'Smith Catering' },
    senderName: 'Sam Rep',
    unsubscribeUrl: 'https://www.eventecos.com/unsubscribe?e=a&t=b',
    postalAddress: '100 Main St',
  };

  it('brands the intro template and fills in the recipient', () => {
    const out = renderOutreach({ ...base, template: 'intro_demo' });
    expect(out.subject).toBe('Hello Jane');
    expect(out.html).toContain('EventEcos-Logo-Only.jpg');
    expect(out.html).toContain('Hi Jane, EventEcos brings');
    expect(out.html).toContain('https://demo.eventecos.com/demo');
    expect(out.html).toContain(
      'href="https://www.eventecos.com/unsubscribe?e=a&amp;t=b"',
    );
    expect(out.html).toContain('100 Main St');
    expect(out.text).toContain(
      'Unsubscribe: https://www.eventecos.com/unsubscribe?e=a&t=b',
    );
  });

  it('wraps a personal message in the same branding with a signature and button', () => {
    const out = renderOutreach({
      ...base,
      template: 'custom',
      message: 'Hi {{firstName}},\n\nI saw {{business}} online.',
      cta: { label: 'Book a call', url: 'https://example.com/book?a=1&b=2' },
    });
    expect(out.html).toContain('Hi Jane,');
    expect(out.html).toContain('I saw Smith Catering online.');
    expect(out.html).toContain('Book a call');
    expect(out.html).toContain('href="https://example.com/book?a=1&amp;b=2"');
    expect(out.html).toContain('Sam Rep');
    expect(out.html).toContain('EventEcos-Logo-Only.jpg');
    expect(out.text).toContain('Book a call: https://example.com/book?a=1&b=2');
  });

  it('escapes anything typed by the agent or taken from the lead', () => {
    const out = renderOutreach({
      ...base,
      template: 'custom',
      recipient: {
        name: '<script>alert(1)</script> Bob',
        business: '"><img src=x>',
      },
      message: '<b>Hi</b> {{business}}',
      senderName: 'Sam <Rep>',
    });
    expect(out.html).not.toContain('<script>');
    expect(out.html).not.toContain('<img src=x>');
    expect(out.html).not.toContain('<b>Hi</b>');
    expect(out.html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
    expect(out.html).toContain('Sam &lt;Rep&gt;');
  });

  it('keeps the subject on one line and leaves unknown tokens alone', () => {
    const out = renderOutreach({
      ...base,
      subject: 'Hi\r\nBcc: evil@x.com {{nope}}',
      template: 'intro_demo',
    });
    expect(out.subject).not.toMatch(/[\r\n]/);
    expect(out.subject).toContain('{{nope}}');
    expect(applyTokens('{{ name }}', { name: 'A' })).toBe('A');
  });

  it('omits the address line when none is configured', () => {
    const out = renderOutreach({
      ...base,
      postalAddress: null,
      template: 'intro_demo',
    });
    expect(out.html).not.toContain('100 Main St');
  });

  it('adds the personal note to the intro template', () => {
    const out = renderOutreach({
      ...base,
      template: 'intro_demo',
      note: 'Loved your menu, {{firstName}}.',
    });
    expect(out.html).toContain('Loved your menu, Jane.');
  });
});

describe('unsubscribe links', () => {
  it('verifies only the token made for that address, ignoring case', () => {
    const token = unsubscribeToken('Jane@Smith.com');
    expect(verifyUnsubscribeToken('jane@smith.com', token)).toBe(true);
    expect(verifyUnsubscribeToken('other@smith.com', token)).toBe(false);
    expect(verifyUnsubscribeToken('jane@smith.com', 'forged')).toBe(false);
    expect(verifyUnsubscribeToken('jane@smith.com', undefined)).toBe(false);
    expect(verifyUnsubscribeToken('jane@smith.com', '')).toBe(false);
  });

  it('builds a link to the unsubscribe page', () => {
    const url = unsubscribeUrl('Jane+x@Smith.com');
    expect(url).toMatch(
      /^https:\/\/www\.eventecos\.com\/unsubscribe\?e=jane%2Bx%40smith\.com&t=[\w-]+$/,
    );
  });
});

describe('parseOutreachRequest', () => {
  it('uses the template subject when none is typed', () => {
    expect(parseOutreachRequest({ template: 'intro_demo' }).subject).toBe(
      'See EventEcos in action',
    );
  });

  it.each([
    [{ template: 'spam' }],
    [{ template: 'custom', subject: 'Hi' }],
    [{ template: 'custom', message: 'x' }],
    [{ template: 'custom', subject: 'Hi', message: 'x', cta_label: 'Go' }],
    [
      {
        template: 'custom',
        subject: 'Hi',
        message: 'x',
        cta_label: 'Go',
        cta_url: 'javascript:alert(1)',
      },
    ],
    [{ template: 'intro_demo', subject: 'x'.repeat(151) }],
  ])('rejects %j', (body) => {
    expect(() => parseOutreachRequest(body)).toThrow(BadRequestException);
  });
});

type Result = { data?: unknown; error?: unknown; count?: number };

function setup(
  tables: Record<string, Result[]>,
  mailResults?: Array<{ id: string | null; error: string | null }>,
) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Array<{ table: string; values: unknown }> = [];
  const db = {
    from: jest.fn((table: string) => {
      const result = tables[table]?.shift() ?? { data: [] };
      const query: Record<string, jest.Mock> = {};
      for (const method of [
        'select',
        'eq',
        'neq',
        'in',
        'gte',
        'order',
        'limit',
        'delete',
      ]) {
        query[method] = jest.fn(() => query);
      }
      query.insert = jest.fn((rows: unknown) => {
        (inserts[table] ??= []).push(rows);
        return query;
      });
      query.update = jest.fn((values: unknown) => {
        updates.push({ table, values });
        return query;
      });
      query.upsert = jest.fn((rows: unknown) => {
        (inserts[`${table}:upsert`] ??= []).push(rows);
        return query;
      });
      query.then = jest.fn((resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
      );
      return query;
    }),
  };
  const mail = {
    sendOutreachBatch: jest.fn((messages: unknown[]) =>
      Promise.resolve(
        mailResults ??
          messages.map((_, i) => ({ id: `msg-${i}`, error: null })),
      ),
    ),
  };
  const service = new OutreachService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    mail as unknown as MailService,
  );
  return { service, mail, inserts, updates, db };
}

const lead = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: 'Jane Smith',
  business_name: 'Smith Catering',
  email: 'jane@smith.com',
  claimed_by_affiliate_id: agent.id,
  ...over,
});

describe('OutreachService.send', () => {
  const body = {
    template: 'intro_demo',
    recipients: [{ type: 'lead', id: LEAD }],
  };

  it('sends a branded email from the agent, with replies and unsubscribe, and logs it on the lead', async () => {
    const { service, mail, inserts, updates } = setup({
      demo_requests: [{ data: [lead(LEAD)] }, { data: null }],
      email_suppressions: [{ data: [] }],
      outreach_emails: [{ data: [] }, { count: 3 }, { data: null }],
      lead_activities: [{ data: null }],
    });
    const result = await service.send(agent, body);
    expect(result).toEqual({ sent: 1, failed: 0, skipped: [], errors: [] });

    const [messages] = mail.sendOutreachBatch.mock.calls[0] as [
      Array<Record<string, any>>,
    ];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      to: 'jane@smith.com',
      replyTo: agent.email,
      subject: 'See EventEcos in action',
    });
    expect(messages[0].from).toContain('Sam Rep (EventEcos)');
    expect(messages[0].html).toContain('Hi Jane, EventEcos brings');
    expect(messages[0].html).toContain(
      '/unsubscribe?e=jane%40smith.com&amp;t=',
    );
    expect(messages[0].headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/www\.eventecos\.com\/unsubscribe\?e=/,
    );

    expect(inserts.outreach_emails[0]).toEqual([
      expect.objectContaining({
        affiliate_id: agent.id,
        recipient_type: 'lead',
        lead_id: LEAD,
        to_email: 'jane@smith.com',
        status: 'sent',
        provider_id: 'msg-0',
      }),
    ]);
    expect(inserts.lead_activities[0]).toEqual([
      expect.objectContaining({
        lead_id: LEAD,
        type: 'email',
        direction: 'outbound',
      }),
    ]);
    expect(updates[0].table).toBe('demo_requests');
  });

  it('skips unsubscribed addresses, recent contacts, duplicates, missing emails and other agents’ leads', async () => {
    const { service, mail } = setup({
      demo_requests: [
        {
          data: [
            lead(LEAD),
            lead(LEAD_2, { name: 'Dup', email: 'JANE@smith.com' }),
            lead('44444444-4444-4444-8444-444444444444', {
              name: 'NoMail',
              email: null,
            }),
            lead('55555555-5555-4555-8555-555555555555', {
              name: 'Theirs',
              claimed_by_affiliate_id: 'other',
            }),
          ],
        },
      ],
      email_suppressions: [{ data: [{ email: 'jane@smith.com' }] }],
      outreach_emails: [{ data: [] }, { count: 0 }],
    });
    const result = await service.send(agent, {
      template: 'intro_demo',
      recipients: [
        { type: 'lead', id: LEAD },
        { type: 'lead', id: LEAD_2 },
        { type: 'lead', id: '44444444-4444-4444-8444-444444444444' },
        { type: 'lead', id: '55555555-5555-4555-8555-555555555555' },
      ],
    });
    expect(result.sent).toBe(0);
    expect(result.skipped.map((s) => s.reason).sort()).toEqual(
      ['duplicate', 'no_email', 'not_yours', 'unsubscribed'].sort(),
    );
    expect(mail.sendOutreachBatch).not.toHaveBeenCalled();
  });

  it('does not email someone contacted in the last two weeks unless told to', async () => {
    const { service, mail } = setup({
      demo_requests: [{ data: [lead(LEAD)] }],
      email_suppressions: [{ data: [] }],
      outreach_emails: [{ data: [{ to_email: 'jane@smith.com' }] }],
    });
    const result = await service.send(agent, body);
    expect(result.skipped).toEqual([
      { name: 'Jane Smith', reason: 'recently_emailed' },
    ]);
    expect(mail.sendOutreachBatch).not.toHaveBeenCalled();

    const again = setup({
      demo_requests: [{ data: [lead(LEAD)] }, { data: null }],
      email_suppressions: [{ data: [] }],
      outreach_emails: [{ count: 0 }, { data: null }],
      lead_activities: [{ data: null }],
    });
    const forced = await again.service.send(agent, {
      ...body,
      allow_repeat: true,
    });
    expect(forced.sent).toBe(1);
  });

  it('records a failure and does not log contact on the lead', async () => {
    const { service, inserts } = setup(
      {
        demo_requests: [{ data: [lead(LEAD)] }],
        email_suppressions: [{ data: [] }],
        outreach_emails: [{ data: [] }, { count: 0 }, { data: null }],
      },
      [{ id: null, error: 'Domain not verified' }],
    );
    const result = await service.send(agent, body);
    expect(result).toMatchObject({
      sent: 0,
      failed: 1,
      errors: ['Domain not verified'],
    });
    expect(inserts.outreach_emails[0]).toEqual([
      expect.objectContaining({
        status: 'failed',
        error: 'Domain not verified',
      }),
    ]);
    expect(inserts.lead_activities).toBeUndefined();
  });

  it('refuses to go over the daily limit', async () => {
    const { service, mail } = setup({
      demo_requests: [{ data: [lead(LEAD)] }],
      email_suppressions: [{ data: [] }],
      outreach_emails: [{ data: [] }, { count: 100 }],
    });
    await expect(service.send(agent, body)).rejects.toThrow('sending limit');
    expect(mail.sendOutreachBatch).not.toHaveBeenCalled();
  });

  it('only lets the manager email platform users, and only the roles the All Users tab shows', async () => {
    const denied = setup({});
    await expect(
      denied.service.send(agent, {
        template: 'intro_demo',
        recipients: [{ type: 'user', id: USER }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const { service, mail, db } = setup({
      users: [
        {
          data: [
            {
              id: USER,
              email: 'owner@venue.com',
              first_name: 'Olive',
              last_name: 'Owner',
              role: 'owner',
            },
          ],
        },
      ],
      owner_accounts: [
        { data: [{ primary_owner_id: USER, business_name: 'Olive Hall' }] },
      ],
      email_suppressions: [{ data: [] }],
      outreach_emails: [{ data: [] }, { count: 0 }, { data: null }],
    });
    const result = await service.send(manager, {
      template: 'custom',
      subject: 'Hi {{firstName}}',
      message: 'About {{business}}',
      recipients: [{ type: 'user', id: USER }],
    });
    expect(result.sent).toBe(1);
    const [messages] = mail.sendOutreachBatch.mock.calls[0] as [
      Array<Record<string, any>>,
    ];
    expect(messages[0].subject).toBe('Hi Olive');
    expect(messages[0].html).toContain('About Olive Hall');
    const usersQuery = db.from.mock.results[0].value as Record<
      string,
      jest.Mock
    >;
    expect(usersQuery.in).toHaveBeenCalledWith('role', [
      'owner',
      'promoter',
      'artist',
      'vendor',
    ]);
  });

  it('accepts typed addresses and rejects invalid ones', async () => {
    const { service } = setup({
      email_suppressions: [{ data: [] }],
      outreach_emails: [{ data: [] }, { count: 0 }, { data: null }],
    });
    const result = await service.send(agent, {
      template: 'intro_demo',
      recipients: [
        { type: 'email', email: 'new@prospect.com', name: 'Pat Lee' },
        { type: 'email', email: 'not-an-email' },
      ],
    });
    expect(result.sent).toBe(1);
    expect(result.skipped).toEqual([
      { name: 'not-an-email', reason: 'invalid_email' },
    ]);
  });

  it('validates the recipient list size and shape', async () => {
    const { service } = setup({});
    await expect(
      service.send(agent, { template: 'intro_demo', recipients: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.send(agent, {
        template: 'intro_demo',
        recipients: Array.from({ length: 51 }, () => ({
          type: 'email',
          email: 'a@b.co',
        })),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.send(agent, {
        template: 'intro_demo',
        recipients: [{ type: 'lead', id: 'nope' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('will not send before the suppression table exists', async () => {
    const { service, mail } = setup({
      demo_requests: [{ data: [lead(LEAD)] }],
      email_suppressions: [
        {
          data: null,
          error: { code: '42P01', message: 'relation does not exist' },
        },
      ],
    });
    await expect(service.send(agent, body)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mail.sendOutreachBatch).not.toHaveBeenCalled();
  });

  it('refuses to send when email is not configured', async () => {
    const key = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const { service } = setup({});
      await expect(service.send(agent, body)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    } finally {
      process.env.RESEND_API_KEY = key;
    }
  });
});

describe('OutreachService other endpoints', () => {
  it('sends a test to the agent only', async () => {
    const { service, mail, inserts } = setup({
      outreach_emails: [{ data: null }],
    });
    await expect(
      service.sendTest(agent, { template: 'intro_demo' }),
    ).resolves.toEqual({ sent_to: agent.email });
    const [messages] = mail.sendOutreachBatch.mock.calls[0] as [
      Array<Record<string, any>>,
    ];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      to: agent.email,
      subject: '[Test] See EventEcos in action',
    });
    expect(inserts.outreach_emails[0]).toEqual([
      expect.objectContaining({ recipient_type: 'test' }),
    ]);
  });

  it('previews with the typed sample name', () => {
    const { service } = setup({});
    const preview = service.preview(agent, {
      template: 'intro_demo',
      subject: 'Hi {{firstName}}',
      sample: { name: 'Jane Smith' },
    });
    expect(preview.subject).toBe('Hi Jane');
    expect(preview.html).toContain('Hi Jane, EventEcos brings');
  });

  it('adds a valid unsubscribe to the suppression list and rejects forged ones', async () => {
    const { service, inserts } = setup({
      email_suppressions: [{ data: null }],
    });
    await expect(
      service.unsubscribe('Jane@Smith.com', unsubscribeToken('jane@smith.com')),
    ).resolves.toEqual({ unsubscribed: true });
    expect(inserts['email_suppressions:upsert'][0]).toEqual({
      email: 'jane@smith.com',
      reason: 'unsubscribed',
    });
    await expect(
      service.unsubscribe('jane@smith.com', 'forged'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.unsubscribe(undefined, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('shows agents only their own history and the manager everyone’s', async () => {
    const mine = setup({ outreach_emails: [{ data: [] }] });
    await mine.service.history(agent);
    const q = mine.db.from.mock.results[0].value as Record<string, jest.Mock>;
    expect(q.eq).toHaveBeenCalledWith('affiliate_id', agent.id);

    const all = setup({ outreach_emails: [{ data: [] }] });
    await all.service.history(manager);
    const q2 = all.db.from.mock.results[0].value as Record<string, jest.Mock>;
    expect(q2.eq).not.toHaveBeenCalled();
  });

  it('reports how many emails are left today', async () => {
    const { service } = setup({ outreach_emails: [{ count: 40 }] });
    await expect(service.config(agent)).resolves.toMatchObject({
      daily_limit: 100,
      sent_today: 40,
      remaining_today: 60,
      email_configured: true,
      postal_address_configured: true,
    });
  });
});
