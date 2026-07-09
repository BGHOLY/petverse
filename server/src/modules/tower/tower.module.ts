import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { TowerRecord } from './tower-record.entity';
import { TowerController } from './tower.controller';
import { TowerService } from './tower.service';

import { PetModule } from '../pet/pet.module';
import { BattleModule } from '../battle/battle.module';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TowerRecord, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    PetModule,
    BattleModule,
  ],
  controllers: [TowerController],
  providers: [TowerService],
  exports: [TowerService],
})
export class TowerModule {}
