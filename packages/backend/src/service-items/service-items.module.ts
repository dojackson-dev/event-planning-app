import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceItemsController } from './service-items.controller';
import { ServiceItemsService } from './service-items.service';
import { ServiceItem } from '../entities/service-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceItem])],
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService],
  exports: [ServiceItemsService],
})
export class ServiceItemsModule {}
