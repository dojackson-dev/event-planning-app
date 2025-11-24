import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { Security } from '../entities/security.entity';
import { Event } from '../entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Security, Event])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
