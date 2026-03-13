import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

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
      throw new UnauthorizedException('An account with this email already exists');
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
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      throw new UnauthorizedException('An account with this email already exists');
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
    
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new UnauthorizedException(userError.message);
    }

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

    // Update auth user metadata
    const { data, error } = await supabase.auth.updateUser({
      data: updateData,
      ...(updateProfileDto.email && updateProfileDto.email !== userData.user.email 
        ? { email: updateProfileDto.email } 
        : {}),
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Also update users table if it exists
    const { error: dbError } = await supabase
      .from('users')
      .update({
        first_name: updateProfileDto.firstName,
        last_name: updateProfileDto.lastName,
        email: updateProfileDto.email,
        phone: updateProfileDto.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.user.id);

    if (dbError) {
      console.warn('Failed to update users table:', dbError.message);
    }

    return {
      message: 'Profile updated successfully',
      user: data.user,
    };
  }

  async changePassword(accessToken: string, changePasswordDto: ChangePasswordDto) {
    const supabase = this.supabaseService.setAuthContext(accessToken);
    
    // Get current user to get email
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new UnauthorizedException(userError.message);
    }

    // Verify current password by attempting to sign in
    const adminSupabase = this.supabaseService.getClient();
    const { error: verifyError } = await adminSupabase.auth.signInWithPassword({
      email: userData.user.email!,
      password: changePasswordDto.currentPassword,
    });

    if (verifyError) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: changePasswordDto.newPassword,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(accessToken: string) {
    const supabase = this.supabaseService.setAuthContext(accessToken);
    
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new UnauthorizedException(userError.message);
    }

    const userId = userData.user.id;

    // Delete user data from database tables
    // Order matters due to foreign key constraints
    try {
      // Delete in order to respect foreign keys
      await supabase.from('notifications').delete().eq('user_id', userId);
      await supabase.from('messages').delete().eq('sender_id', userId);
      await supabase.from('users').delete().eq('id', userId);
    } catch (dbError) {
      console.warn('Error deleting user data from tables:', dbError);
    }

    // Delete the auth user using admin client
    const adminSupabase = this.supabaseService.getClient();
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Account deleted successfully' };
  }
}
