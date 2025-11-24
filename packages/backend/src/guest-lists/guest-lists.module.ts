import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestListsController } from './guest-lists.controller';
import { GuestListsService } from './guest-lists.service';
import { GuestList } from '../entities/guest-list.entity';
import { Guest } from '../entities/guest.entity';
import { User } from '../entities/user.entity';
import { Event } from '../entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GuestList, Guest, User, Event])],
  controllers: [GuestListsController],
  providers: [GuestListsService],
  exports: [GuestListsService],
})
export class GuestListsModule {}
