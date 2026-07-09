import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';

import { Pet } from '../pet/pet.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pet, TowerRecord, User]),
  ],
  controllers: [RankingController],
  providers: [RankingService],
})
export class RankingModule {}
