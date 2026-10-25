import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventCancellationService } from './event-cancellation.service';

type Row = { id: string; owner_id: string; status: string } | null;

function build(row: Row, opts: { noteFails?: boolean } = {}) {
  const updates: string[] = [];
  const admin = {
    from: jest.fn(() => {
      const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        update: jest.fn((v: any) => {
          updates.push(v.status);
          if (row) row = { ...row, status: v.status };
          return chain;
        }),
        maybeSingle: jest.fn(async () => ({ data: row, error: null })),
        single: jest.fn(async () => ({ data: row, error: null })),
      };
      return chain;
    }),
  };
  const notes = {
    create: opts.noteFails
      ? jest.fn().mockRejectedValue(new Error('note failed'))
      : jest.fn(async (_e: string, _u: string, dto: any) => ({ id: 'n1', content: dto.content })),
  };
  const svc = new EventCancellationService(
    { getAdminClient: () => admin } as any,
    notes as any,
  );
  return { svc, notes, updates };
}

const ev = (status: string) => ({ id: 'e1', owner_id: 'u1', status });

describe('EventCancellationService', () => {
  it('cancels, records the reason as a note', async () => {
    const { svc, notes, updates } = build(ev('scheduled'));
    const res = await svc.cancel('u1', 'e1', '  Venue flooded  ');
    expect(updates).toEqual(['cancelled']);
    expect(notes.create).toHaveBeenCalledWith('e1', 'u1', { content: 'Event cancelled: Venue flooded' });
    expect(res.note.id).toBe('n1');
  });

  it('requires a reason', async () => {
    const { svc, updates } = build(ev('scheduled'));
    await expect(svc.cancel('u1', 'e1', '  ')).rejects.toBeInstanceOf(BadRequestException);
    expect(updates).toEqual([]);
  });

  it('rejects non-owners and missing events', async () => {
    await expect(build(ev('scheduled')).svc.cancel('other', 'e1', 'because')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(build(null).svc.cancel('u1', 'e1', 'because')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses already-cancelled and completed events', async () => {
    await expect(build(ev('cancelled')).svc.cancel('u1', 'e1', 'because')).rejects.toBeInstanceOf(BadRequestException);
    await expect(build(ev('completed')).svc.cancel('u1', 'e1', 'because')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rolls the status back when the note cannot be saved', async () => {
    const { svc, updates } = build(ev('draft'), { noteFails: true });
    await expect(svc.cancel('u1', 'e1', 'because')).rejects.toThrow('note failed');
    expect(updates).toEqual(['cancelled', 'draft']);
  });

  it('reinstates only cancelled events and logs a note', async () => {
    const { svc, notes, updates } = build(ev('cancelled'));
    await svc.reinstate('u1', 'e1', 'Rebooked');
    expect(updates).toEqual(['scheduled']);
    expect(notes.create).toHaveBeenCalledWith('e1', 'u1', { content: 'Event reinstated: Rebooked' });
    await expect(build(ev('scheduled')).svc.reinstate('u1', 'e1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
