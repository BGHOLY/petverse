
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pet } from '../pet/pet.entity';
import { BattleSessionV10 } from '../battle/battle-session.entity';
import { WorldExplorationProgress } from '../exploration/world-exploration.entity';
import { SeasonModule } from '../season/season.module';
import { PetTeam } from '../team/pet-team.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { RankingController } from './ranking.controller';
import { RankingSnapshot } from './ranking-snapshot.entity';
import { RankingService } from './ranking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pet,
      PetTeam,
      WorldExplorationProgress,
      BattleSessionV10,
      TowerRecord,
      User,
      RankingSnapshot,
    ]),
    SeasonModule,
  ],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
