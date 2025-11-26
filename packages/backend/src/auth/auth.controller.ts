import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

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
}
