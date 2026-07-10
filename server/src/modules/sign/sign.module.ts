import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DailyTaskModule } from '../daily-task/daily-task.module';
import { EconomyModule } from '../economy/economy.module';
import { SignController } from './sign.controller';
import { SignRecord } from './sign-record.entity';
import { SignService } from './sign.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignRecord]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    DailyTaskModule,
    EconomyModule,
  ],
  controllers: [SignController],
  providers: [SignService],
})
export class SignModule {}
