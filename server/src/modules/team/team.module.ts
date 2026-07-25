import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentModule } from '../equipment/equipment.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';

import { Pet } from '../pet/pet.entity';
import { PetTeam } from './pet-team.entity';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PetTeam, Pet]),
    EquipmentModule,
    DailyTaskModule,
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService, TypeOrmModule],
})
export class TeamModule {}
