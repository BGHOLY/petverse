import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { Pet } from '../pet/pet.entity';
import { SkillController } from './skill.controller';
import { SkillLearningLog } from './skill-learning-log.entity';
import { Skill } from './skill.entity';
import { SkillService } from './skill.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Skill,
      SkillLearningLog,
      Pet,
    ]),
    EconomyModule,
  ],
  controllers: [SkillController],
  providers: [SkillService],
  exports: [TypeOrmModule, SkillService],
})
export class SkillModule {}
