import { ConflictException, NotFoundException } from '@nestjs/common';
import { IntakeFormsService } from './intake-forms.service';

const OWNER = '6e7b0130-9c1d-4a1a-bb02-723a4c67557c';
const CLIENT = '5353d89d-123c-4bb6-9094-1b6047ffa28d';

function setup(opts: { form?: boolean; guests?: number; events?: number }) {
  const calls: { events?: string; guestsFor?: unknown } = {};
  const admin = {
    from: jest.fn((table: string) => {
      const q: any = {};
      q.select = jest.fn(() => q);
      q.eq = jest.fn((col: string, val: unknown) => {
        if (table === 'rsvp_guests') calls.guestsFor = val;
        return q;
      });
      q.or = jest.fn((expr: string) => {
        calls.events = expr;
        return q;
      });
      q.maybeSingle = jest.fn(() =>
        Promise.resolve({ data: opts.form === false ? null : { id: CLIENT } }),
      );
      q.then = (resolve: any) =>
        resolve({
          count:
            table === 'rsvp_guests' ? (opts.guests ?? 0) : (opts.events ?? 0),
        });
      return q;
    }),
  };
  const deleteQuery = {
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  };
  // the final .eq() resolves the delete
  deleteQuery.eq = jest
    .fn()
    .mockReturnValueOnce(deleteQuery)
    .mockResolvedValueOnce({ error: null });
  const userClient = { from: jest.fn(() => deleteQuery) };
  const service = new IntakeFormsService(
    { getAdminClient: () => admin } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, userClient, deleteQuery, calls };
}

describe('IntakeFormsService.remove', () => {
  it('refuses to delete a client who has RSVP guests or events, and says how many', async () => {
    const { service, userClient, deleteQuery } = setup({
      guests: 12,
      events: 1,
    });
    const err: any = await service
      .remove(userClient as any, OWNER, CLIENT)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({
      code: 'CLIENT_HAS_LINKED_DATA',
      guests: 12,
      events: 1,
    });
    expect(err.getResponse().message).toContain('12 RSVP guests');
    expect(deleteQuery.delete).not.toHaveBeenCalled();
  });

  it('looks at events linked either way', async () => {
    const { service, userClient, calls } = setup({ events: 1 });
    await service
      .remove(userClient as any, OWNER, CLIENT)
      .catch(() => undefined);
    expect(calls.events).toBe(
      `intake_form_id.eq.${CLIENT},client_id.eq.${CLIENT}`,
    );
    expect(calls.guestsFor).toBe(CLIENT);
  });

  it('deletes a client with nothing attached', async () => {
    const { service, userClient, deleteQuery } = setup({
      guests: 0,
      events: 0,
    });
    await expect(
      service.remove(userClient as any, OWNER, CLIENT),
    ).resolves.toEqual({ message: 'Intake form deleted successfully' });
    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
  });

  it('deletes anyway once the caller confirms with force', async () => {
    const { service, userClient, deleteQuery } = setup({
      guests: 12,
      events: 1,
    });
    await expect(
      service.remove(userClient as any, OWNER, CLIENT, true),
    ).resolves.toEqual({ message: 'Intake form deleted successfully' });
    expect(deleteQuery.delete).toHaveBeenCalledTimes(1);
  });

  it("404s for a client that is not the owner's", async () => {
    const { service, userClient } = setup({ form: false });
    await expect(
      service.remove(userClient as any, OWNER, CLIENT),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
