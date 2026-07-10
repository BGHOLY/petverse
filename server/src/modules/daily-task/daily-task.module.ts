import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { DailyTaskController } from './daily-task.controller';
import { DailyTask } from './daily-task.entity';
import { DailyTaskService } from './daily-task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyTask]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    EconomyModule,
  ],
  controllers: [DailyTaskController],
  providers: [DailyTaskService],
  exports: [DailyTaskService],
})
export class DailyTaskModule {}
