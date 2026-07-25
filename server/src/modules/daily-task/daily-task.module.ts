import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RewardModule } from '../reward/reward.module';
import { ActivityProgress } from '../retention/activity-progress.entity';
import { DailyTaskProgress } from './daily-task-progress.entity';
import { TaskEventRecord } from './task-event-record.entity';
import { TaskActivityClaim } from './task-activity-claim.entity';
import { DailyTaskController } from './daily-task.controller';
import { DailyTask } from './daily-task.entity';
import { DailyTaskService } from './daily-task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyTask,
      DailyTaskProgress,
      TaskEventRecord,
      TaskActivityClaim,
      ActivityProgress,
    ]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    RewardModule,
  ],
  controllers: [DailyTaskController],
  providers: [DailyTaskService],
  exports: [DailyTaskService],
})
export class DailyTaskModule {}
