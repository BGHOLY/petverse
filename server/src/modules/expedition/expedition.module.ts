import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { ItemModule } from '../item/item.module';
import { Pet } from '../pet/pet.entity';
import { ExpeditionController } from './expedition.controller';
import { Expedition } from './expedition.entity';
import { ExpeditionService } from './expedition.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expedition, Pet]),
    EconomyModule,
    ItemModule,
  ],
  controllers: [ExpeditionController],
  providers: [ExpeditionService],
  exports: [ExpeditionService],
})
export class ExpeditionModule {}
