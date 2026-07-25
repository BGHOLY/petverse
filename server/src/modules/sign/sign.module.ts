import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyTaskModule } from '../daily-task/daily-task.module';
import { RewardModule } from '../reward/reward.module';
import { SignClaim } from './sign-claim.entity';
import { SignController } from './sign.controller';
import { SignRecord } from './sign-record.entity';
import { SignService } from './sign.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignRecord, SignClaim]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    DailyTaskModule,
    RewardModule,
  ],
  controllers: [SignController],
  providers: [SignService],
  exports: [SignService, TypeOrmModule],
})
export class SignModule {}
