import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { Friend } from '../friend/friend.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Marriage } from '../marriage/marriage.entity';
import { Pet } from '../pet/pet.entity';
import { SignRecord } from '../sign/sign-record.entity';
import { TowerRecord } from '../tower/tower-record.entity';
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
    ]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    EconomyModule,
  ],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementModule {}
