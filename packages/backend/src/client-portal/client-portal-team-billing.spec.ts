import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';

const EVENT = 'event-1';
const OTHER_EVENT = 'event-2';
const FORM = 'form-1';
const CLIENT = '+16012183374';
const ERIKA = '+16018268890';
const DUSTIN = '+16018964885';
const STRANGER = '+16015550000';

function setup(members: Record<string, unknown>[] = []) {
  const db = new FakeDb({
    event: [
      {
        id: EVENT,
        name: 'POSM Christmas Party',
        owner_id: 'owner-1',
        intake_form_id: FORM,
      },
      {
        id: OTHER_EVENT,
        name: 'Other party',
        owner_id: 'owner-1',
        intake_form_id: 'form-x',
      },
    ],
    intake_forms: [{ id: FORM, contact_phone: CLIENT }],
    event_team_members: [
      {
        id: 'm-erika',
        event_id: EVENT,
        phone: '6018268890',
        name: 'Erika',
        can_manage_billing: true,
      },
      {
        id: 'm-dustin',
        event_id: EVENT,
        phone: '6018964885',
        name: 'Dustin',
        can_manage_billing: false,
      },
      ...members,
    ],
    estimates: [
      {
        id: 'est-a',
        event_id: EVENT,
        client_phone: CLIENT,
        intake_form_id: null,
        status: 'sent',
        owner_id: 'owner-1',
        created_at: '2026-11-01',
      },
      {
        id: 'est-draft',
        event_id: EVENT,
        client_phone: CLIENT,
        intake_form_id: null,
        status: 'draft',
        owner_id: 'owner-1',
        created_at: '2026-11-02',
      },
      {
        id: 'est-other',
        event_id: OTHER_EVENT,
        client_phone: '+19999999999',
        intake_form_id: 'form-x',
        status: 'sent',
        owner_id: 'owner-1',
        created_at: '2026-11-03',
      },
    ],
    invoices: [
      {
        id: 'inv-a',
        event_id: EVENT,
        client_phone: CLIENT,
        intake_form_id: null,
        status: 'sent',
        amount_due: 500,
        total_amount: 500,
        owner_id: 'owner-1',
        created_at: '2026-11-01',
      },
      {
        id: 'inv-draft',
        event_id: EVENT,
        client_phone: CLIENT,
        intake_form_id: null,
        status: 'draft',
        amount_due: 100,
        total_amount: 100,
        owner_id: 'owner-1',
        created_at: '2026-11-02',
      },
      {
        id: 'inv-other',
        event_id: OTHER_EVENT,
        client_phone: '+19999999999',
        intake_form_id: 'form-x',
        status: 'sent',
        amount_due: 50,
        total_amount: 50,
        owner_id: 'owner-1',
        created_at: '2026-11-03',
      },
    ],
    owner_accounts: [],
    vendor_invoices: [],
  });
  const stripe = {
    createInvoiceCheckoutSession: jest
      .fn()
      .mockResolvedValue('https://pay.example/session'),
  };
  const sms = { clientTeamMemberAdded: jest.fn().mockResolvedValue(undefined) };
  const service = new ClientPortalService(
    { getAdminClient: () => db } as never,
    stripe as never,
    sms as never,
    {} as never,
  );
  return { db, service, stripe, sms };
}

describe('team members see the event estimates and invoices', () => {
  it('shows a team member the estimates for their event, never drafts or other events', async () => {
    const { service } = setup();
    const estimates = await service.getEstimates('c', ERIKA);
    expect(estimates.map((e: any) => e.id)).toEqual(['est-a']);
  });

  it('shows the invoices for their event, never drafts or other events', async () => {
    const { service } = setup();
    const invoices = await service.getInvoices('c', DUSTIN);
    expect(invoices.map((i: any) => i.id)).toEqual(['inv-a']);
  });

  it('marks what a member may do: Erika can act, Dustin is view-only, the client always can', async () => {
    const { service } = setup();
    expect((await service.getEstimates('c', ERIKA))[0]).toMatchObject({
      can_respond: true,
    });
    expect((await service.getEstimates('c', DUSTIN))[0]).toMatchObject({
      can_respond: false,
    });
    expect((await service.getEstimates('c', CLIENT))[0]).toMatchObject({
      can_respond: true,
    });
    expect((await service.getInvoices('c', ERIKA))[0]).toMatchObject({
      can_pay: true,
    });
    expect((await service.getInvoices('c', DUSTIN))[0]).toMatchObject({
      can_pay: false,
    });
    expect((await service.getInvoices('c', CLIENT))[0]).toMatchObject({
      can_pay: true,
    });
  });

  it('shows a stranger nothing', async () => {
    const { service } = setup();
    expect(await service.getEstimates('c', STRANGER)).toEqual([]);
    expect(await service.getInvoices('c', STRANGER)).toEqual([]);
  });

  it('opens a single estimate for a team member but not for a stranger', async () => {
    const { service } = setup();
    expect(await service.getEstimateById('est-a', 'c', DUSTIN)).toMatchObject({
      id: 'est-a',
      can_respond: false,
    });
    await expect(
      service.getEstimateById('est-a', 'c', STRANGER),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getEstimateById('est-other', 'c', ERIKA),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('approving estimates', () => {
  it('lets a member with the right approve', async () => {
    const { service, db } = setup();
    await expect(
      service.respondToEstimate('est-a', 'c', ERIKA, 'approved'),
    ).resolves.toMatchObject({ status: 'approved' });
    expect(db.rows('estimates').find((e) => e.id === 'est-a')?.status).toBe(
      'approved',
    );
  });

  it('refuses a view-only member and leaves the estimate alone', async () => {
    const { service, db } = setup();
    await expect(
      service.respondToEstimate('est-a', 'c', DUSTIN, 'approved'),
    ).rejects.toThrow(ForbiddenException);
    expect(db.rows('estimates').find((e) => e.id === 'est-a')?.status).toBe(
      'sent',
    );
  });

  it('refuses a stranger and a member of a different event', async () => {
    const { service } = setup();
    await expect(
      service.respondToEstimate('est-a', 'c', STRANGER, 'approved'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.respondToEstimate('est-other', 'c', ERIKA, 'approved'),
    ).rejects.toThrow(NotFoundException);
  });

  it('still lets the original client approve', async () => {
    const { service } = setup();
    await expect(
      service.respondToEstimate('est-a', 'c', CLIENT, 'rejected'),
    ).resolves.toMatchObject({ status: 'rejected' });
  });
});

describe('paying invoices', () => {
  it('lets a member with the right start a checkout', async () => {
    const { service, stripe } = setup();
    await expect(
      service.createInvoiceCheckout('inv-a', 'c', ERIKA, 'Erika'),
    ).resolves.toEqual({ url: 'https://pay.example/session' });
    expect(stripe.createInvoiceCheckoutSession).toHaveBeenCalledWith(
      'inv-a',
      'Erika',
      undefined,
      undefined,
    );
  });

  it('refuses a view-only member without touching Stripe', async () => {
    const { service, stripe } = setup();
    await expect(
      service.createInvoiceCheckout('inv-a', 'c', DUSTIN, 'Dustin'),
    ).rejects.toThrow(ForbiddenException);
    expect(stripe.createInvoiceCheckoutSession).not.toHaveBeenCalled();
  });

  it('refuses a stranger and an invoice from another event', async () => {
    const { service, stripe } = setup();
    await expect(
      service.createInvoiceCheckout('inv-a', 'c', STRANGER, 'X'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createInvoiceCheckout('inv-other', 'c', ERIKA, 'Erika'),
    ).rejects.toThrow(NotFoundException);
    expect(stripe.createInvoiceCheckoutSession).not.toHaveBeenCalled();
  });

  it('still lets the original client pay', async () => {
    const { service } = setup();
    await expect(
      service.createInvoiceCheckout('inv-a', 'c', CLIENT, 'Client'),
    ).resolves.toHaveProperty('url');
  });
});

describe('managing the team', () => {
  it("returns the permission with each member and hides the adder's number", async () => {
    const { service } = setup();
    const members = await service.getTeamMembers(EVENT, CLIENT);
    expect(members.map((m: any) => [m.name, m.can_manage_billing])).toEqual([
      ['Erika', true],
      ['Dustin', false],
    ]);
    expect(members[0]).not.toHaveProperty('added_by_phone');
  });

  it('lets the original client add a member with or without the billing right', async () => {
    const { service, db } = setup();
    await service.addTeamMember(
      EVENT,
      CLIENT,
      '(601) 555-1111',
      'Pat',
      'Larry',
      true,
    );
    await service.addTeamMember(
      EVENT,
      CLIENT,
      '(601) 555-2222',
      'Sam',
      'Larry',
    );
    const rows = db.rows('event_team_members');
    expect(rows.find((r) => r.name === 'Pat')?.can_manage_billing).toBe(true);
    expect(
      rows.find((r) => r.name === 'Sam')?.can_manage_billing,
    ).toBeUndefined();
  });

  it('lets the original client change the right later, and nobody else', async () => {
    const { service, db } = setup();
    await service.updateTeamMember(EVENT, CLIENT, 'm-dustin', true);
    expect(
      db.rows('event_team_members').find((r) => r.id === 'm-dustin')
        ?.can_manage_billing,
    ).toBe(true);
    await service.updateTeamMember(EVENT, CLIENT, 'm-dustin', false);
    expect(
      db.rows('event_team_members').find((r) => r.id === 'm-dustin')
        ?.can_manage_billing,
    ).toBe(false);

    await expect(
      service.updateTeamMember(EVENT, ERIKA, 'm-dustin', true),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.updateTeamMember(EVENT, CLIENT, 'missing', true),
    ).rejects.toThrow(NotFoundException);
  });

  it('takes effect straight away for the member', async () => {
    const { service } = setup();
    await expect(
      service.respondToEstimate('est-a', 'c', DUSTIN, 'approved'),
    ).rejects.toThrow(ForbiddenException);
    await service.updateTeamMember(EVENT, CLIENT, 'm-dustin', true);
    await expect(
      service.respondToEstimate('est-a', 'c', DUSTIN, 'approved'),
    ).resolves.toMatchObject({ status: 'approved' });
  });
});
