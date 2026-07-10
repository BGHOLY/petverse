import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyTaskModule } from '../daily-task/daily-task.module';
import { FriendModule } from '../friend/friend.module';
import { PetModule } from '../pet/pet.module';
import { TeamModule } from '../team/team.module';
import { BattleController } from './battle.controller';
import { Battle } from './battle.entity';
import { BattleService } from './battle.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Battle]),
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
    TeamModule,
  ],
  controllers: [BattleController],
  providers: [BattleService],
  exports: [BattleService],
})
export class BattleModule {}
