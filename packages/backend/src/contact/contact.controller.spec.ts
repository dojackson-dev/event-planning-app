import { BadRequestException, HttpException } from '@nestjs/common';
import { ContactController } from './contact.controller';
import type { MailService } from '../mail/mail.service';

function setup(sent = true) {
  const sendDemoRequest = jest.fn().mockResolvedValue(sent);
  const controller = new ContactController({
    sendDemoRequest,
  } as unknown as MailService);
  return { controller, sendDemoRequest };
}

const valid = {
  name: 'Jane Smith',
  phone: '(404) 555-0123',
  role: 'venue_owner',
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
    ['unknown role', { ...valid, role: 'admin' }],
    ['inherited key as role', { ...valid, role: 'constructor' }],
    ['missing role', { ...valid, role: undefined as unknown as string }],
    ['long description', { ...valid, description: 'x'.repeat(2001) }],
  ])('rejects %s', async (_label, body) => {
    const { controller, sendDemoRequest } = setup();
    await expect(controller.demoRequest(body, req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sendDemoRequest).not.toHaveBeenCalled();
  });

  it('reports a delivery failure instead of pretending it worked', async () => {
    const { controller } = setup(false);
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
