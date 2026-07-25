import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { DailyTaskModule } from '../daily-task/daily-task.module';
import { Egg } from '../egg/egg.entity';
import { EquipmentItem } from '../equipment/equipment.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { Mail } from '../mail/mail.entity';
import { Marriage } from '../marriage/marriage.entity';
import { MarriageProposal } from '../marriage/marriage-proposal.entity';
import { RewardModule } from '../reward/reward.module';
import { SignModule } from '../sign/sign.module';
import { User } from '../user/user.entity';
import { ActivityProgress } from './activity-progress.entity';
import { ActivityRewardClaim } from './activity-reward-claim.entity';
import { NewcomerClaim } from './newcomer-claim.entity';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Egg,
      Marriage,
      BattleSessionV10,
      EquipmentItem,
      ActivityProgress,
      ActivityRewardClaim,
      NewcomerClaim,
      Mail,
      FriendRequest,
      MarriageProposal,
    ]),
    DailyTaskModule,
    SignModule,
    RewardModule,
  ],
  controllers: [RetentionController],
  providers: [RetentionService],
  exports: [RetentionService, TypeOrmModule],
})
export class RetentionModule {}
