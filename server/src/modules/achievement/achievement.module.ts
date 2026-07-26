import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RewardModule } from '../reward/reward.module';
import { BattleSessionV10 } from '../battle/battle-session.entity';
import { Egg } from '../egg/egg.entity';
import { EquipmentItem } from '../equipment/equipment.entity';
import { Friend } from '../friend/friend.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Marriage } from '../marriage/marriage.entity';
import { Pet } from '../pet/pet.entity';
import { SignRecord } from '../sign/sign-record.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { AchievementController } from './achievement.controller';
import { Achievement } from './achievement.entity';
import { AchievementService } from './achievement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      Pet,
      TowerRecord,
      SignRecord,
      Friend,
      FusionRecord,
      Marriage,
      Egg,
      EquipmentItem,
      BattleSessionV10,
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
    RewardModule,
  ],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementModule {}
