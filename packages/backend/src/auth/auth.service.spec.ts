import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('ignores schema-missing cleanup errors when deleting an account', async () => {
    const fromMock = jest.fn((table: string) => ({
      delete: () => ({
        eq: () => ({
          error: {
            message: `Could not find the table 'public.${table}' in the schema cache`,
          },
        }),
      }),
      update: () => ({
        eq: () => ({
          error: {
            message: `Could not find the column 'assigned_to' of 'public.intake_forms' in the schema cache`,
          },
        }),
      }),
    }));

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: fromMock,
    };

    const adminSupabase = {
      auth: {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    };

    const supabaseService = {
      setAuthContext: jest.fn().mockReturnValue(supabase),
      getAdminClient: jest.fn().mockReturnValue(adminSupabase),
    };

    const service = new AuthService(supabaseService as any);

    await expect(service.deleteAccount('token-123')).resolves.toEqual({
      message: 'Account deleted successfully',
    });
    expect(adminSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
  });

  it('throws when admin user deletion fails', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-456' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        delete: () => ({ eq: () => ({ error: null }) }),
        update: () => ({ eq: () => ({ error: null }) }),
      }),
    };

    const adminSupabase = {
      auth: {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({
            error: { message: 'Delete failed for some reason' },
          }),
        },
      },
    };

    const supabaseService = {
      setAuthContext: jest.fn().mockReturnValue(supabase),
      getAdminClient: jest.fn().mockReturnValue(adminSupabase),
    };

    const service = new AuthService(supabaseService as any);

    await expect(service.deleteAccount('token-456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
