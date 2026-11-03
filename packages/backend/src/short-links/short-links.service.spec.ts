import { NotFoundException } from '@nestjs/common';
import { ShortLinksService } from './short-links.service';

function serviceReturning(row: { slug: string } | null) {
  const q: any = {};
  for (const m of ['select', 'eq']) q[m] = jest.fn(() => q);
  q.maybeSingle = jest.fn().mockResolvedValue({ data: row });
  const from = jest.fn(() => q);
  const service = new ShortLinksService({
    getAdminClient: () => ({ from }),
  } as any);
  return { service, from, q };
}

describe('ShortLinksService', () => {
  it.each([
    ['b', 'vendor_booking_links', '/book/savour-8bnz'],
    ['a', 'artist_booking_links', '/book-artist/savour-8bnz'],
    ['p', 'promoter_booking_links', '/book-promoter/savour-8bnz'],
    ['v', 'owner_booking_links', '/book-venue/savour-8bnz'],
  ])('resolves /%s/<code> from %s to %s', async (kind, table, path) => {
    const { service, from, q } = serviceReturning({ slug: 'savour-8bnz' });
    await expect(service.resolve(kind, '6PP9Y4')).resolves.toEqual({ path });
    expect(from).toHaveBeenCalledWith(table);
    expect(q.eq).toHaveBeenCalledWith('short_code', '6pp9y4');
    expect(q.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('404s for a code that is unknown or switched off', async () => {
    const { service } = serviceReturning(null);
    await expect(service.resolve('b', 'abcdef')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s for an unknown kind or a malformed code without touching the database', async () => {
    const { service, from } = serviceReturning({ slug: 'x' });
    await expect(service.resolve('z', 'abcdef')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.resolve('b', "a'; drop table--"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(from).not.toHaveBeenCalled();
  });

  it('encodes the slug in the path', async () => {
    const { service } = serviceReturning({ slug: 'a b/c' });
    await expect(service.resolve('b', 'abcdef')).resolves.toEqual({
      path: '/book/a%20b%2Fc',
    });
  });
});
