import { VendorsService } from './vendors.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { SmsNotificationsService } from '../messaging/sms-notifications.service';
import type { MailService } from '../mail/mail.service';

function setup(events: Array<Record<string, unknown>>) {
  const inFn = jest.fn().mockResolvedValue({ data: events });
  const select = jest.fn().mockReturnValue({ in: inFn });
  const from = jest.fn().mockReturnValue({ select });
  const supabase = {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;
  const service = new VendorsService(
    supabase,
    {} as unknown as SmsNotificationsService,
    {} as unknown as MailService,
  );
  const fill = (
    service as unknown as {
      fillEventTimes: (rows: unknown[]) => Promise<
        Array<{
          id: string;
          start_time: string | null;
          end_time: string | null;
        }>
      >;
    }
  ).fillEventTimes.bind(service);
  return { fill, from, inFn };
}

describe('VendorsService event time fallback', () => {
  it('fills missing booking times from the linked event', async () => {
    const { fill, from } = setup([
      { id: 'e1', start_time: '13:30:00', end_time: '16:00:00' },
    ]);
    const [row] = await fill([
      { id: 'b1', event_id: 'e1', start_time: null, end_time: null },
    ]);
    expect(row).toMatchObject({ start_time: '13:30:00', end_time: '16:00:00' });
    expect(from).toHaveBeenCalledWith('event');
  });

  it("keeps a booking's own times and only fills the blanks", async () => {
    const { fill } = setup([
      { id: 'e1', start_time: '13:30:00', end_time: '16:00:00' },
    ]);
    const [row] = await fill([
      { id: 'b1', event_id: 'e1', start_time: '17:00:00', end_time: null },
    ]);
    expect(row).toMatchObject({ start_time: '17:00:00', end_time: '16:00:00' });
  });

  it('skips the lookup when nothing needs filling', async () => {
    const { fill, from } = setup([]);
    const rows = [
      { id: 'b1', event_id: null, start_time: null, end_time: null },
      { id: 'b2', event_id: 'e1', start_time: '10:00', end_time: '12:00' },
    ];
    expect(await fill(rows)).toEqual(rows);
    expect(from).not.toHaveBeenCalled();
  });
});
