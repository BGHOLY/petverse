import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BattleSessionV10 } from '../battle/battle-session.entity';
import { EconomyModule } from '../economy/economy.module';
import { EggModule } from '../egg/egg.module';
import { ExplorationController } from './exploration.controller';
import { ExplorationService } from './exploration.service';
import { WorldExplorationProgress } from './world-exploration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorldExplorationProgress, BattleSessionV10]), EconomyModule, EggModule],
  controllers: [ExplorationController],
  providers: [ExplorationService],
  exports: [ExplorationService],
})
export class ExplorationModule {}
