import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GameOperationRecord } from '../economy/game-operation-record.entity';
import { FriendRequest } from '../friend/friend-request.entity';
import { Friend } from '../friend/friend.entity';
import { FusionRecord } from '../fusion/fusion-record.entity';
import { Item } from '../item/item.entity';
import { Mail } from '../mail/mail.entity';
import { Marriage } from '../marriage/marriage.entity';
import { MarriageProposal } from '../marriage/marriage-proposal.entity';
import { Pet } from '../pet/pet.entity';
import { RankingSnapshot } from '../ranking/ranking-snapshot.entity';
import { SeasonPlayer } from '../season/season-player.entity';
import { Season } from '../season/season.entity';
import { Skill } from '../skill/skill.entity';
import { PetTeam } from '../team/pet-team.entity';
import { TradeListing } from '../trade/trade-listing.entity';
import { TradeRecord } from '../trade/trade-record.entity';
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
      Friend,
      FriendRequest,
      Mail,
      Marriage,
      MarriageProposal,
      Season,
      SeasonPlayer,
      RankingSnapshot,
      TradeListing,
      TradeRecord,
    ]),
  ],
  controllers: [BackendController],
  providers: [BackendService],
})
export class BackendModule {}
