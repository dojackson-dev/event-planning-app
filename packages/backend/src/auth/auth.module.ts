import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DevAuthController } from './dev-auth.controller';

@Module({
  controllers: [AuthController, DevAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
