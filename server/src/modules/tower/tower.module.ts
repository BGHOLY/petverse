import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { TowerRecord } from './tower-record.entity';
import { TowerController } from './tower.controller';
import { TowerService } from './tower.service';

import { PetModule } from '../pet/pet.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TowerRecord]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    PetModule,
    DailyTaskModule,
  ],
  controllers: [TowerController],
  providers: [TowerService],
})
export class TowerModule {}