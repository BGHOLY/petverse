import { Module } from '@nestjs/common';

import { EggModule } from '../egg/egg.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PetModule } from '../pet/pet.module';
import { HatcheryController } from './hatchery.controller';
import { HatcheryService } from './hatchery.service';

@Module({
  imports: [EggModule, InventoryModule, PetModule, DailyTaskModule],
  controllers: [HatcheryController],
  providers: [HatcheryService],
  exports: [HatcheryService],
})
export class HatcheryModule {}
