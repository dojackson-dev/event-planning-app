import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async register(registerDto: RegisterDto) {
    const supabase = this.supabaseService.getClient();

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
}
