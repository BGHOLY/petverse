import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyTaskModule } from '../daily-task/daily-task.module';
import { FriendModule } from '../friend/friend.module';
import { SeasonModule } from '../season/season.module';
import { FormationModule } from '../formation/formation.module';
import { TeamModule } from '../team/team.module';
import { PetModule } from '../pet/pet.module';
import { User } from '../user/user.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { BattleController } from './battle.controller';
import { Battle } from './battle.entity';
import { BattleService } from './battle.service';
import { BattleV10Service } from './battle-v10.service';
import { BattleSessionV10 } from './battle-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Battle, BattleSessionV10, User, TowerRecord]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    PetModule,
    FriendModule,
    DailyTaskModule,
    SeasonModule,
    TeamModule,
    FormationModule,
  ],
  controllers: [BattleController],
  providers: [BattleService, BattleV10Service],
  exports: [BattleService, BattleV10Service],
})
export class BattleModule {}
