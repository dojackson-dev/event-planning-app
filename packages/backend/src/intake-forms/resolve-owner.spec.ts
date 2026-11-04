import { NotFoundException } from '@nestjs/common';
import { resolveOwnerIdentifier } from './resolve-owner';

const OWNER = '99394c1a-5714-44ac-bd5f-97c3f2a478d5';
const MEMBER = '85d8b2f0-1111-4222-8333-444455556666';

/** Fake admin client: each table answers `maybeSingle()` with the next queued row. */
function admin(rows: Record<string, Array<Record<string, unknown> | null>>) {
  const from = jest.fn((table: string) => {
    const q: any = {};
    for (const m of ['select', 'eq', 'not', 'limit']) q[m] = jest.fn(() => q);
    q.maybeSingle = jest.fn(() =>
      Promise.resolve({ data: (rows[table] ?? []).shift() ?? null }),
    );
    return q;
  });
  return { from } as any;
}

describe('resolveOwnerIdentifier', () => {
  it('resolves an intake slug', async () => {
    const client = admin({
      owner_accounts: [{ primary_owner_id: OWNER }],
    });
    await expect(
      resolveOwnerIdentifier(client, 'the-rookery-ms'),
    ).resolves.toBe(OWNER);
  });

  it('404s for an unknown slug', async () => {
    await expect(
      resolveOwnerIdentifier(admin({}), 'nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves the primary owner id', async () => {
    const client = admin({ owner_accounts: [{ primary_owner_id: OWNER }] });
    await expect(resolveOwnerIdentifier(client, OWNER)).resolves.toBe(OWNER);
  });

  it("resolves a team member's id to the account they work for", async () => {
    const client = admin({
      owner_accounts: [null, { primary_owner_id: OWNER }],
      memberships: [{ owner_account_id: 7 }],
    });
    await expect(resolveOwnerIdentifier(client, MEMBER)).resolves.toBe(OWNER);
  });

  it('404s for an id that is neither an owner nor a team member', async () => {
    const client = admin({ owner_accounts: [null], memberships: [null] });
    await expect(resolveOwnerIdentifier(client, MEMBER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
