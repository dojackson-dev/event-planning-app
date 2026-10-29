import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntakeFormsService } from './intake-forms.service';

function setup(form: Record<string, unknown> | null, mailResult = true) {
  const tables: Array<{ table: string; filters: Array<[string, unknown]> }> =
    [];
  const userClient = {
    from: (table: string) => {
      const entry = { table, filters: [] as Array<[string, unknown]> };
      tables.push(entry);
      const query: any = {
        select: () => query,
        eq: (col: string, value: unknown) => {
          entry.filters.push([col, value]);
          return query;
        },
        maybeSingle: async () => ({ data: form, error: null }),
      };
      return query;
    },
  };
  const adminClient = {
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: { business_name: 'The Rookery MS' },
          error: null,
        }),
      };
      return query;
    },
  };
  const mail = {
    sendClientPortalGuide: jest.fn().mockResolvedValue(mailResult),
  };
  const service = new IntakeFormsService(
    { getAdminClient: () => adminClient } as any,
    mail as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, mail, userClient, tables };
}

describe('IntakeFormsService.sendPortalGuide', () => {
  it("emails the guide for the owner's own client, with the venue name", async () => {
    const { service, mail, userClient, tables } = setup({
      contact_name: 'Dee',
      contact_email: 'dee@example.test',
    });
    await expect(
      service.sendPortalGuide(userClient as any, 'owner-1', 'form-1'),
    ).resolves.toEqual({ sent: true, to: 'dee@example.test' });
    expect(mail.sendClientPortalGuide).toHaveBeenCalledWith({
      clientName: 'Dee',
      clientEmail: 'dee@example.test',
      venueName: 'The Rookery MS',
    });
    // The lookup is scoped to the signed-in owner.
    expect(tables[0].filters).toEqual([
      ['id', 'form-1'],
      ['user_id', 'owner-1'],
    ]);
  });

  it("treats another owner's client as not found and sends nothing", async () => {
    const { service, mail, userClient } = setup(null);
    await expect(
      service.sendPortalGuide(userClient as any, 'owner-2', 'form-1'),
    ).rejects.toThrow(NotFoundException);
    expect(mail.sendClientPortalGuide).not.toHaveBeenCalled();
  });

  it('explains when the client has no email address', async () => {
    const { service, mail, userClient } = setup({
      contact_name: 'Dee',
      contact_email: null,
    });
    await expect(
      service.sendPortalGuide(userClient as any, 'owner-1', 'form-1'),
    ).rejects.toThrow('no email address');
    expect(mail.sendClientPortalGuide).not.toHaveBeenCalled();
  });

  it('tells the owner when the email could not be sent', async () => {
    const { service, userClient } = setup(
      { contact_name: 'Dee', contact_email: 'dee@example.test' },
      false,
    );
    await expect(
      service.sendPortalGuide(userClient as any, 'owner-1', 'form-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
