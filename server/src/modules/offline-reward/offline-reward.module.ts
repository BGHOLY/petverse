import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { OfflineReward } from './offline-reward.entity';
import { OfflineRewardController } from './offline-reward.controller';
import { OfflineRewardService } from './offline-reward.service';

import { User } from '../user/user.entity';
import { PetModule } from '../pet/pet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfflineReward, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    PetModule,
  ],
  controllers: [OfflineRewardController],
  providers: [OfflineRewardService],
})
export class OfflineRewardModule {}