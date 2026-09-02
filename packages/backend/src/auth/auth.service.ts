import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  RegisterDto,
  LoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async register(registerDto: RegisterDto) {
    const supabase = this.supabaseService.getClient();

    // Check if email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', registerDto.email.toLowerCase())
      .single();

    if (existingUser) {
      throw new UnauthorizedException(
        'An account with this email already exists',
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
      options: {
        data: {
          first_name: registerDto.firstName,
          last_name: registerDto.lastName,
          role: registerDto.role,
          phone: registerDto.phone,
        },
      },
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    // Check for Supabase's "fake success" response when email already exists
    // If user has no identities, it means the email already exists in Supabase Auth
    if (
      data.user &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      throw new UnauthorizedException(
        'An account with this email already exists',
      );
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async login(loginDto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginDto.email,
      password: loginDto.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    };
  }

  async refreshToken(refreshToken: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    };
  }

  async logout(accessToken: string) {
    const supabase = this.supabaseService.setAuthContext(accessToken);
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return { message: 'Logged out successfully' };
  }

  async getUser(accessToken: string) {
    const supabase = this.supabaseService.setAuthContext(accessToken);
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return data.user;
  }

  async updateProfile(accessToken: string, updateProfileDto: UpdateProfileDto) {
    const supabase = this.supabaseService.setAuthContext(accessToken);

    // Verify token and get current user via getUser (works with just Authorization header)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new UnauthorizedException(userError.message);
    }

    const userId = userData.user.id;

    // Build update data for auth metadata
    const updateData: any = {};
    if (updateProfileDto.firstName !== undefined) {
      updateData.first_name = updateProfileDto.firstName;
    }
    if (updateProfileDto.lastName !== undefined) {
      updateData.last_name = updateProfileDto.lastName;
    }
    if (updateProfileDto.phone !== undefined) {
      updateData.phone = updateProfileDto.phone;
    }

    // Use admin client to update user — avoids "Auth session missing" error
    // that occurs when calling updateUser() with only a Bearer token (no active session)
    const adminSupabase = this.supabaseService.getAdminClient();
    const updatePayload: any = { data: updateData };
    if (
      updateProfileDto.email &&
      updateProfileDto.email !== userData.user.email
    ) {
      updatePayload.email = updateProfileDto.email;
    }

    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      userId,
      updatePayload,
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Also update users table
    const { error: dbError } = await adminSupabase
      .from('users')
      .update({
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        ...(updateProfileDto.email ? { email: updateProfileDto.email } : {}),
        phone_number: updateProfileDto.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (dbError) {
      console.warn('Failed to update users table:', dbError.message);
    }

    return {
      message: 'Profile updated successfully',
      user: data.user,
    };
  }

  async changePassword(
    accessToken: string,
    changePasswordDto: ChangePasswordDto,
  ) {
    const supabase = this.supabaseService.setAuthContext(accessToken);

    // Get current user to get email
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new UnauthorizedException(userError.message);
    }

    // Verify current password by attempting to sign in
    const anonSupabase = this.supabaseService.getClient();
    const { error: verifyError } = await anonSupabase.auth.signInWithPassword({
      email: userData.user.email!,
      password: changePasswordDto.currentPassword,
    });

    if (verifyError) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password using admin client to avoid "Auth session missing" error
    const adminSupabase = this.supabaseService.getAdminClient();
    const { error } = await adminSupabase.auth.admin.updateUserById(
      userData.user.id,
      {
        password: changePasswordDto.newPassword,
      },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Password changed successfully' };
  }

  private isMissingSchemaError(message: string): boolean {
    return /Could not find the table|Could not find the column|schema cache/i.test(
      message,
    );
  }

  private async cleanupUserRelatedData(
    supabase: ReturnType<SupabaseService['setAuthContext']>,
    userId: string,
  ) {
    const cleanupSteps = [
      { table: 'notifications', type: 'delete' as const, column: 'user_id' },
      { table: 'messages', type: 'delete' as const, column: 'sender_id' },
      {
        table: 'service_items',
        type: 'update' as const,
        column: 'owner_id',
        payload: { owner_id: null },
      },
      {
        table: 'intake_forms',
        type: 'update' as const,
        column: 'assigned_to',
        payload: { assigned_to: null },
      },
      {
        table: 'invites',
        type: 'update' as const,
        column: 'accepted_by',
        payload: { accepted_by: null },
      },
      {
        table: 'vendor_bookings',
        type: 'delete' as const,
        column: 'booked_by_user_id',
      },
      {
        table: 'vendor_reviews',
        type: 'delete' as const,
        column: 'reviewer_user_id',
      },
      { table: 'users', type: 'delete' as const, column: 'id' },
    ];

    for (const step of cleanupSteps) {
      try {
        let result:
          | { error?: { message?: string } | null }
          | null
          | undefined;

        if (step.type === 'delete') {
          result = await supabase
            .from(step.table)
            .delete()
            .eq(step.column, userId);
        } else {
          result = await supabase
            .from(step.table)
            .update(step.payload)
            .eq(step.column, userId);
        }

        if (result?.error) {
          const message = result.error.message ?? 'Unknown cleanup error';
          if (this.isMissingSchemaError(message)) {
            continue;
          }

          console.warn(
            `Delete cleanup warning for ${step.table}.${step.column}: ${message}`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.isMissingSchemaError(message)) {
          continue;
        }

        throw error;
      }
    }
  }

  async deleteAccount(accessToken: string) {
    const supabase = this.supabaseService.setAuthContext(accessToken);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new UnauthorizedException(userError.message);
    }

    const userId = userData.user.id;

    await this.cleanupUserRelatedData(supabase, userId);

    const adminSupabase = this.supabaseService.getAdminClient();
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Account deleted successfully' };
  }
}
