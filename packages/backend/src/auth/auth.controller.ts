import { Controller, Post, Body, Get, Put, Delete, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body?.refresh_token) {
      throw new UnauthorizedException('refresh_token is required');
    }
    return this.authService.refreshToken(body.refresh_token);
  }

  @Post('logout')
  async logout(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    const token = authorization.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  @Get('me')
  async getMe(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    const token = authorization.replace('Bearer ', '');
    return this.authService.getUser(token);
  }

  @Put('profile')
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    const token = authorization.replace('Bearer ', '');
    return this.authService.updateProfile(token, updateProfileDto);
  }

  @Put('password')
  async changePassword(
    @Headers('authorization') authorization: string,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    const token = authorization.replace('Bearer ', '');
    return this.authService.changePassword(token, changePasswordDto);
  }

  @Delete('account')
  async deleteAccount(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    const token = authorization.replace('Bearer ', '');
    return this.authService.deleteAccount(token);
  }
}
