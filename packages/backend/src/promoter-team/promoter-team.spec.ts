import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PromoterAccessService } from './promoter-access.service';
import { PromoterTeamService } from './promoter-team.service';

interface TableCfg {
  single?: unknown;
  /** Consumed one per maybeSingle() call, then null */
  singles?: unknown[];
  rows?: unknown[];
  count?: number;
}

function makeSupabase(tables: Record<string, TableCfg>) {
  const calls: Array<{ table: string; op: string; arg?: unknown }> = [];
  const from = (table: string) => {
    const cfg = tables[table] ?? {};
    const b: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'lt', 'gt', 'order']) {
      b[m] = jest.fn().mockReturnValue(b);
    }
    for (const m of ['insert', 'update', 'delete']) {
      b[m] = jest.fn().mockImplementation((arg?: unknown) => {
        calls.push({ table, op: m, arg });
        return b;
      });
    }
    b.maybeSingle = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: cfg.singles
          ? (cfg.singles.shift() ?? null)
          : (cfg.single ?? null),
        error: null,
      }),
    );
    b.single = b.maybeSingle;
    (b as unknown as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
    ) =>
      resolve({
        data: cfg.rows ?? null,
        count: cfg.count ?? 0,
        error: null,
      });
    return b;
  };
  const service = {
    getAdminClient: () => ({ from }),
    getClient: () => ({}),
  } as unknown as SupabaseService;
  return { service, calls };
}

describe('PromoterAccessService', () => {
  const member = (role: string) => ({
    single: {
      role,
      promoter_account_id: 'acct-1',
      account: { user_id: 'creator-1' },
    },
  });

  it('never touches the database for the self policy', async () => {
    const { service } = makeSupabase({});
    const getAdminClient = jest.spyOn(service, 'getAdminClient');
    const access = new PromoterAccessService(service);
    await expect(access.resolveUserId('u1', 'self')).resolves.toBe('u1');
    expect(getAdminClient).not.toHaveBeenCalled();
  });

  it('leaves non-members (including the creator) unchanged', async () => {
    const { service } = makeSupabase({ promoter_team_members: {} });
    const access = new PromoterAccessService(service);
    await expect(access.resolveUserId('u1', 'write')).resolves.toBe('u1');
    await expect(access.resolveUserId('u1', 'owner')).resolves.toBe('u1');
  });

  it('lets an admin act as the creator except for owner-only routes', async () => {
    const { service } = makeSupabase({
      promoter_team_members: member('admin'),
    });
    const access = new PromoterAccessService(service);
    await expect(access.resolveUserId('m1', 'read')).resolves.toBe('creator-1');
    await expect(access.resolveUserId('m1', 'write')).resolves.toBe(
      'creator-1',
    );
    await expect(access.resolveUserId('m1', 'scan')).resolves.toBe('creator-1');
    await expect(access.resolveUserId('m1', 'owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('limits staff to reading and scanning', async () => {
    const { service } = makeSupabase({
      promoter_team_members: member('staff'),
    });
    const access = new PromoterAccessService(service);
    await expect(access.resolveUserId('m1', 'read')).resolves.toBe('creator-1');
    await expect(access.resolveUserId('m1', 'scan')).resolves.toBe('creator-1');
    await expect(access.resolveUserId('m1', 'write')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(access.resolveUserId('m1', 'owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('PromoterTeamService', () => {
  const owner = {
    id: 'acct-1',
    user_id: 'creator-1',
    email: 'creator@example.com',
    company_name: 'Acme Promotions',
    contact_name: 'Pat',
  };

  function setup(tables: Record<string, TableCfg>) {
    const { service, calls } = makeSupabase(tables);
    const mail = {
      sendTeamInvitation: jest.fn().mockResolvedValue(undefined),
    } as unknown as MailService;
    const team = new PromoterTeamService(
      service,
      mail,
      new PromoterAccessService(service),
    );
    return { team, calls, mail };
  }

  it('only lets the account creator manage the team', async () => {
    const { team } = setup({ promoter_accounts: {} });
    await expect(
      team.invite('not-the-creator', 'a@b.co', 'staff'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      team.removeMember('not-the-creator', 'm1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unknown role and a malformed email', async () => {
    const { team } = setup({ promoter_accounts: { single: owner } });
    await expect(team.invite('creator-1', 'a@b.co', 'owner')).rejects.toThrow(
      /admin or staff/,
    );
    await expect(
      team.invite('creator-1', 'not-an-email', 'staff'),
    ).rejects.toThrow(/valid email/);
  });

  it('blocks invites once members plus pending invites reach the limit of 3', async () => {
    const { team, calls } = setup({
      promoter_accounts: { single: owner },
      promoter_team_members: { count: 2 },
      promoter_team_invitations: { count: 1 },
    });
    await expect(
      team.invite('creator-1', 'new@example.com', 'staff'),
    ).rejects.toThrow(/limited to 3/);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('refuses to invite someone who already owns a promoter account', async () => {
    const { team } = setup({
      promoter_accounts: { single: owner },
      promoter_team_members: { count: 0 },
      promoter_team_invitations: { count: 0 },
      users: { single: { id: 'other-user' } },
    });
    await expect(
      team.invite('creator-1', 'other@example.com', 'admin'),
    ).rejects.toThrow(/own promoter account/);
  });

  it('creates a pending invite with the chosen role and emails the token link', async () => {
    const { team, calls, mail } = setup({
      promoter_accounts: { single: owner },
      promoter_team_members: { count: 0 },
      promoter_team_invitations: { count: 0 },
    });
    const result = await team.invite('creator-1', ' New@Example.com ', 'admin');

    const insert = calls.find(
      (c) => c.table === 'promoter_team_invitations' && c.op === 'insert',
    );
    expect(insert?.arg).toMatchObject({
      promoter_account_id: 'acct-1',
      email: 'new@example.com',
      role: 'admin',
      status: 'pending',
    });
    expect(
      (mail.sendTeamInvitation as jest.Mock).mock.calls[0][0],
    ).toMatchObject({
      toEmail: 'new@example.com',
      businessName: 'Acme Promotions',
      roleLabel: 'an admin',
    });
    expect(result).toMatchObject({ success: true, emailDelivered: true });
  });

  it('removing a member that is not on this team returns 404', async () => {
    const { team } = setup({
      promoter_accounts: { single: owner },
      promoter_team_members: { rows: [] },
    });
    await expect(
      team.removeMember('creator-1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removing a member deletes the membership row scoped to the creator account', async () => {
    const { team, calls } = setup({
      // First lookup is the creator, second is the removed user (owns no account)
      promoter_accounts: { singles: [owner, null] },
      promoter_team_members: { rows: [{ id: 'm1', user_id: 'u9' }] },
      users: { single: { roles: ['owner', 'promoter'] } },
    });
    await expect(team.removeMember('creator-1', 'm1')).resolves.toEqual({
      success: true,
    });
    expect(
      calls.some(
        (c) => c.table === 'promoter_team_members' && c.op === 'delete',
      ),
    ).toBe(true);
    // Other roles are kept, promoter is dropped
    expect(
      calls.find((c) => c.table === 'users' && c.op === 'update')?.arg,
    ).toEqual({ roles: ['owner'] });
  });

  it('rejects a bad token cleanly when the invite is not pending', async () => {
    const { team } = setup({
      promoter_team_invitations: {
        single: {
          id: 'i1',
          status: 'accepted',
          expires_at: new Date(Date.now() + 1e6).toISOString(),
        },
      },
    });
    await expect(team.getInviteInfo('tok')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
