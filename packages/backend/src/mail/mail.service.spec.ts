import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

/** Captures the HTML and text body from the last sendMail call. */
function captureLastMail(sendMailMock: jest.Mock) {
  const call = sendMailMock.mock.calls[sendMailMock.mock.calls.length - 1];
  return call ? (call[0] as { html: string; text: string }) : null;
}

describe('MailService – sendClientInvitation', () => {
  let service: MailService;
  let sendMailMock: jest.Mock;

  const baseParams = {
    clientName: 'Alice Smith',
    clientEmail: 'alice@test.com',
    inviteToken: 'tok-123',
    eventType: 'birthday_party',
    eventDate: '2026-09-15',
  };

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });

    mockedNodemailer.createTransport = jest.fn().mockReturnValue({
      sendMail: sendMailMock,
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: SupabaseService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Time formatting ────────────────────────────────────────────────────────

  it('formats a PM start time in 12h format', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '17:00' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('5:00 PM');
    expect(mail?.text).toContain('5:00 PM');
  });

  it('formats an AM start time in 12h format', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '09:30' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('9:30 AM');
  });

  it('formats midnight as 12:00 AM', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '00:00' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('12:00 AM');
  });

  it('formats noon as 12:00 PM', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '12:00' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('12:00 PM');
  });

  it('renders start – end time range when both provided', async () => {
    await service.sendClientInvitation({
      ...baseParams,
      eventTime: '17:00',
      endTime: '21:30',
    });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('5:00 PM');
    expect(mail?.html).toContain('9:30 PM');
    // The dash separator must appear between both times
    expect(mail?.html).toMatch(/5:00 PM\s*[–-]\s*9:30 PM/);
  });

  it('renders only start time when no end time provided', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '14:00' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('2:00 PM');
    // Should NOT contain an em-dash range separator
    expect(mail?.html).not.toMatch(/2:00 PM\s*[–-]/);
  });

  it('omits the time row entirely when no eventTime given', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: null });
    const mail = captureLastMail(sendMailMock);
    // The time table row should not appear
    expect(mail?.html).not.toContain('>Time<');
  });

  it('omits the time row when eventTime is undefined', async () => {
    await service.sendClientInvitation({ ...baseParams });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).not.toContain('>Time<');
  });

  // ── Event Type removed ─────────────────────────────────────────────────────

  it('does NOT include Event Type in the HTML email body', async () => {
    await service.sendClientInvitation({
      ...baseParams,
      eventType: 'wedding_reception',
    });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).not.toContain('Event Type');
    expect(mail?.html).not.toContain('wedding_reception');
  });

  it('does NOT include Event: line in the plain-text email', async () => {
    await service.sendClientInvitation({
      ...baseParams,
      eventType: 'birthday_party',
      eventTime: '18:00',
    });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.text).not.toMatch(/^Event:/m);
  });

  // ── Plain-text time format ─────────────────────────────────────────────────

  it('plain text contains formatted 12h time when start time given', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '20:00' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.text).toContain('8:00 PM');
  });

  it('plain text contains time range when both start and end time given', async () => {
    await service.sendClientInvitation({
      ...baseParams,
      eventTime: '18:00',
      endTime: '22:00',
    });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.text).toMatch(/6:00 PM\s*[–-]\s*10:00 PM/);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('handles 1:00 AM correctly (not 13:00 PM)', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '01:00' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('1:00 AM');
    expect(mail?.html).not.toContain('13:');
  });

  it('handles single-digit minutes with zero-padding', async () => {
    await service.sendClientInvitation({ ...baseParams, eventTime: '14:05' });
    const mail = captureLastMail(sendMailMock);
    expect(mail?.html).toContain('2:05 PM');
  });

  it('does not throw and returns without sending when transporter fails', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP error'));
    // Should not throw — error is swallowed (non-fatal)
    await expect(
      service.sendClientInvitation({ ...baseParams, eventTime: '10:00' }),
    ).resolves.not.toThrow();
  });
});
