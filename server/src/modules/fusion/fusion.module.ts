import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { EquipmentItem } from '../equipment/equipment.entity';
import { Expedition } from '../expedition/expedition.entity';
import { Pet } from '../pet/pet.entity';
import { PetModule } from '../pet/pet.module';
import { PetTeam } from '../team/pet-team.entity';
import { FusionController } from './fusion.controller';
import { FusionRecord } from './fusion-record.entity';
import { FusionService } from './fusion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pet,
      PetTeam,
      FusionRecord,
      Expedition,
      EquipmentItem,
    ]),
    PetModule,
    EconomyModule,
  ],
  controllers: [FusionController],
  providers: [FusionService],
  exports: [FusionService],
})
export class FusionModule {}
