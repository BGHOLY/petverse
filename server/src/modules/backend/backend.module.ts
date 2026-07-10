import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameOperationRecord } from '../economy/game-operation-record.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Item } from '../item/item.entity';
import { Pet } from '../pet/pet.entity';
import { Skill } from '../skill/skill.entity';
import { PetTeam } from '../team/pet-team.entity';
import { BackendController } from './backend.controller';
import { BackendService } from './backend.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Skill,
      Item,
      Pet,
      FusionRecord,
      GameOperationRecord,
      PetTeam,
    ]),
  ],
  controllers: [BackendController],
  providers: [BackendService],
})
export class BackendModule {}
