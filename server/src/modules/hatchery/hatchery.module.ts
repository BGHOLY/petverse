import { Module } from '@nestjs/common';

import { EggModule } from '../egg/egg.module';
import { PetModule } from '../pet/pet.module';
import { HatcheryController } from './hatchery.controller';
import { HatcheryService } from './hatchery.service';

@Module({
  imports: [EggModule, PetModule],
  controllers: [HatcheryController],
  providers: [HatcheryService],
  exports: [HatcheryService],
})
export class HatcheryModule {}
