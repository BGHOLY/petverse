import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BattleModule } from '../battle/battle.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';
import { PetModule } from '../pet/pet.module';
import { User } from '../user/user.entity';
import { TeamModule } from '../team/team.module';
import { TowerController } from './tower.controller';
import { TowerRecord } from './tower-record.entity';
import { TowerService } from './tower.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TowerRecord,
      User,
    ]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    PetModule,
    BattleModule,
    DailyTaskModule,
    TeamModule,
  ],
  controllers: [TowerController],
  providers: [TowerService],
  exports: [TowerService],
})
export class TowerModule {}
