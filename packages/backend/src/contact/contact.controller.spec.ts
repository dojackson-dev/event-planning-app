import { BadRequestException, HttpException } from '@nestjs/common';
import { ContactController } from './contact.controller';
import type { MailService } from '../mail/mail.service';
import type { DemoRequestsService } from './demo-requests.service';

function setup(sent = true, saved = true) {
  const sendDemoRequest = jest.fn().mockResolvedValue(sent);
  const create = jest.fn().mockResolvedValue(saved);
  const controller = new ContactController(
    { sendDemoRequest } as unknown as MailService,
    { create } as unknown as DemoRequestsService,
  );
  return { controller, sendDemoRequest, create };
}

const valid: {
  name: string;
  phone: string;
  roles?: string[];
  role?: string;
  description?: string;
} = {
  name: 'Jane Smith',
  phone: '(404) 555-0123',
  roles: ['venue_owner'],
  description: 'Two venues, 5 staff',
};
const req = { ip: '1.2.3.4', headers: {} };

describe('ContactController.demoRequest', () => {
  it('emails the request with a readable role label', async () => {
    const { controller, sendDemoRequest } = setup();
    await expect(controller.demoRequest(valid, req)).resolves.toEqual({
      success: true,
    });
    expect(sendDemoRequest).toHaveBeenCalledWith({
      name: 'Jane Smith',
      phone: '(404) 555-0123',
      role: 'Venue Owner',
      description: 'Two venues, 5 staff',
    });
  });

  it('combines several selected roles into one label', async () => {
    const { controller, sendDemoRequest } = setup();
    await controller.demoRequest(
      { ...valid, roles: ['promoter', 'vendor', 'promoter'] },
      req,
    );
    expect(sendDemoRequest).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Promoter, Vendor' }),
    );
  });

  it('still accepts the single role field', async () => {
    const { controller, sendDemoRequest } = setup();
    await controller.demoRequest(
      { name: 'Jane Smith', phone: valid.phone, role: 'artist' },
      req,
    );
    expect(sendDemoRequest).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Artist' }),
    );
  });

  it('saves the request as a lead with the role keys', async () => {
    const { controller, create } = setup();
    await controller.demoRequest(
      { ...valid, roles: ['promoter', 'vendor'] },
      req,
    );
    expect(create).toHaveBeenCalledWith({
      name: 'Jane Smith',
      phone: '(404) 555-0123',
      roles: ['promoter', 'vendor'],
      description: 'Two venues, 5 staff',
    });
  });

  it('still succeeds when only the email could not be sent', async () => {
    const { controller } = setup(false, true);
    await expect(controller.demoRequest(valid, req)).resolves.toEqual({
      success: true,
    });
  });

  it('still succeeds when only saving the lead failed', async () => {
    const { controller } = setup(true, false);
    await expect(controller.demoRequest(valid, req)).resolves.toEqual({
      success: true,
    });
  });

  it('treats the description as optional', async () => {
    const { controller, sendDemoRequest } = setup();
    await controller.demoRequest({ ...valid, description: '  ' }, req);
    expect(sendDemoRequest).toHaveBeenCalledWith(
      expect.objectContaining({ description: undefined }),
    );
  });

  it.each([
    ['missing name', { ...valid, name: ' ' }],
    ['bad phone', { ...valid, phone: 'call me' }],
    ['short phone', { ...valid, phone: '12345' }],
    ['unknown role', { ...valid, roles: ['admin'] }],
    ['inherited key as role', { ...valid, roles: ['constructor'] }],
    [
      'one bad role among good ones',
      { ...valid, roles: ['promoter', 'admin'] },
    ],
    ['non-string role', { ...valid, roles: [1 as unknown as string] }],
    ['empty roles', { ...valid, roles: [] }],
    ['missing role', { ...valid, roles: undefined }],
    ['long description', { ...valid, description: 'x'.repeat(2001) }],
  ])('rejects %s', async (_label, body) => {
    const { controller, sendDemoRequest } = setup();
    await expect(controller.demoRequest(body, req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sendDemoRequest).not.toHaveBeenCalled();
  });

  it('reports a failure only when the lead was neither saved nor emailed', async () => {
    const { controller } = setup(false, false);
    await expect(controller.demoRequest(valid, req)).rejects.toMatchObject({
      status: 503,
    });
  });

  it('limits repeat requests from one address', async () => {
    const { controller } = setup();
    for (let i = 0; i < 5; i += 1) {
      await controller.demoRequest(valid, req);
    }
    await expect(controller.demoRequest(valid, req)).rejects.toBeInstanceOf(
      HttpException,
    );
    // A different forwarded client is not affected.
    await expect(
      controller.demoRequest(valid, {
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' },
      }),
    ).resolves.toEqual({ success: true });
  });
});
