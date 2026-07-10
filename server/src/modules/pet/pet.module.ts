import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyTaskModule } from '../daily-task/daily-task.module';
import { PetCapacityModule } from '../pet-capacity/pet-capacity.module';
import { BreedingModule } from '../breeding/breeding.module';
import { SkillModule } from '../skill/skill.module';
import { PetTeam } from '../team/pet-team.entity';
import { PetController } from './pet.controller';
import { Pet } from './pet.entity';
import { PetService } from './pet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pet, PetTeam]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    SkillModule,
    BreedingModule,
    DailyTaskModule,
    PetCapacityModule,
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [TypeOrmModule, PetService],
})
export class PetModule {}
