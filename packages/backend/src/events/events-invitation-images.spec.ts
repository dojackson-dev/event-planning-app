import { BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { SupabaseService } from '../supabase/supabase.service';

function setup(management: Record<string, unknown> = {}) {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['select', 'update', 'eq']) {
    query[method] = jest.fn(() => query);
  }
  query.single = jest.fn().mockResolvedValue({
    data: { management_data: management },
    error: null,
  });
  query.then = jest.fn((resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve),
  );
  const database = { from: jest.fn(() => query) };
  const service = new EventsService({
    getAdminClient: () => database,
  } as unknown as SupabaseService);
  return { service, query };
}

describe('EventsService invitation images', () => {
  const url = 'https://example.test/invitation.webp';

  it('saves images for the owner without losing other management data', async () => {
    const { service, query } = setup({ venue: 'The Rookery MS' });
    await expect(
      service.setInvitationImages('owner-1', 'event-1', [url]),
    ).resolves.toEqual([url]);
    expect(query.update).toHaveBeenCalledWith({
      management_data: { venue: 'The Rookery MS', invitationImages: [url] },
    });
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
  });

  it.each([
    ['a non-array', 'nope'],
    ['more than two images', [url, url, url]],
    ['a non-https URL', ['javascript:alert(1)']],
  ])('rejects %s', async (_label, images) => {
    const { service, query } = setup();
    await expect(
      service.setInvitationImages('owner-1', 'event-1', images),
    ).rejects.toThrow(BadRequestException);
    expect(query.update).not.toHaveBeenCalled();
  });

  it('keeps existing images when a stale form is saved without them', async () => {
    const { service, query } = setup({ invitationImages: [url], venue: 'Old' });
    await service.saveManagementData('owner-1', 'event-1', { venue: 'New' });
    expect(query.update).toHaveBeenCalledWith({
      management_data: { invitationImages: [url], venue: 'New' },
    });
  });
});

describe('EventsService update with blank form fields', () => {
  function updateSetup() {
    const query: Record<string, jest.Mock> = {};
    for (const method of ['update', 'eq', 'select']) {
      query[method] = jest.fn(() => query);
    }
    query.single = jest
      .fn()
      .mockResolvedValue({ data: { id: 'event-1' }, error: null });
    const client = { from: jest.fn(() => query) };
    const service = new EventsService({} as unknown as SupabaseService);
    return { service, query, client };
  }

  it('clears an empty end time instead of sending an empty string Postgres rejects', async () => {
    const { service, query, client } = updateSetup();
    await service.update(
      client as never,
      'event-1',
      {
        name: 'Samuel Boyd, Jr',
        startTime: '13:30:00',
        endTime: '',
        venueId: '',
        maxGuests: 100,
      } as never,
      'owner-1',
    );
    expect(query.update).toHaveBeenCalledWith({
      name: 'Samuel Boyd, Jr',
      start_time: '13:30:00',
      end_time: null,
      venue_id: null,
      guest_count: 100,
    });
  });

  it('keeps the stored value when a required field is sent blank', async () => {
    const { service, query, client } = updateSetup();
    await service.update(
      client as never,
      'event-1',
      { name: 'Party', startTime: '', date: '' } as never,
      'owner-1',
    );
    expect(query.update).toHaveBeenCalledWith({ name: 'Party' });
  });
});
