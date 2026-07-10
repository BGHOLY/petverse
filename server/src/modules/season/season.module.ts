
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Mail } from '../mail/mail.entity';
import { Pet } from '../pet/pet.entity';
import { RankingSnapshot } from '../ranking/ranking-snapshot.entity';
import { TowerRecord } from '../tower/tower-record.entity';
import { User } from '../user/user.entity';
import { SeasonController } from './season.controller';
import { SeasonPlayer } from './season-player.entity';
import { Season } from './season.entity';
import { SeasonService } from './season.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Season,
      SeasonPlayer,
      User,
      Pet,
      TowerRecord,
      Mail,
      RankingSnapshot,
    ]),
  ],
  controllers: [SeasonController],
  providers: [SeasonService],
  exports: [TypeOrmModule, SeasonService],
})
export class SeasonModule {}
