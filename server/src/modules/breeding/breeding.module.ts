import { Module } from '@nestjs/common';

import { BreedingService } from './breeding.service';

@Module({
  providers: [BreedingService],
  exports: [BreedingService],
})
export class BreedingModule {}
