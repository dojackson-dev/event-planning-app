import { StaffPayController } from './staff-pay.controller';

function setup(sendSetupLink: jest.Mock) {
  const staffPay = {
    createMember: jest.fn().mockResolvedValue({ id: 'm1', name: 'Iris Young' }),
  };
  const controller = new StaffPayController(
    staffPay as any,
    { sendSetupLink } as any,
    {
      setAuthContext: () => ({
        auth: {
          getUser: () =>
            Promise.resolve({ data: { user: { id: 'owner-1' } }, error: null }),
        },
      }),
    } as any,
  );
  return { controller, staffPay };
}

describe('adding a staff member', () => {
  it('always texts them the Stripe sign-up link', async () => {
    const send = jest.fn().mockResolvedValue({ texted: true, link: 'x' });
    const { controller, staffPay } = setup(send);
    const out = await controller.createMember('Bearer t', {
      name: 'Iris Young',
      phone: '6014734198',
    });
    expect(staffPay.createMember).toHaveBeenCalledWith('owner-1', {
      name: 'Iris Young',
      phone: '6014734198',
    });
    expect(send).toHaveBeenCalledWith('owner-1', 'm1');
    expect(out).toMatchObject({ id: 'm1', setup_texted: true });
  });

  it('still saves the worker and says so when the text could not be sent', async () => {
    const { controller } = setup(
      jest.fn().mockResolvedValue({ texted: false, link: 'x' }),
    );
    expect(await controller.createMember('Bearer t', {})).toMatchObject({
      id: 'm1',
      setup_texted: false,
    });
  });

  it('still saves the worker if creating the link fails outright', async () => {
    const { controller } = setup(
      jest.fn().mockRejectedValue(new Error('boom')),
    );
    expect(await controller.createMember('Bearer t', {})).toMatchObject({
      id: 'm1',
      setup_texted: false,
    });
  });
});
