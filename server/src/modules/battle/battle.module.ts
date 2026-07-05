import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { Battle } from './battle.entity';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';

import { PetModule } from '../pet/pet.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Battle]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    PetModule,
    DailyTaskModule,
  ],
  controllers: [BattleController],
  providers: [BattleService],
})
export class BattleModule {}