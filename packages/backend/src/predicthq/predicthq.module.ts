import { Module } from '@nestjs/common';
import { PredictHQService } from './predicthq.service';
import { PredictHQController } from './predicthq.controller';

@Module({
  controllers: [PredictHQController],
  providers: [PredictHQService],
  exports: [PredictHQService],
})
export class PredictHQModule {}
