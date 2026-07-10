
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pet } from '../pet/pet.entity';
import { SeasonModule } from '../season/season.module';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { RankingController } from './ranking.controller';
import { RankingSnapshot } from './ranking-snapshot.entity';
import { RankingService } from './ranking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pet,
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
