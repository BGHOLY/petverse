import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { DailyTask } from './daily-task.entity';
import { DailyTaskController } from './daily-task.controller';
import { DailyTaskService } from './daily-task.service';

import { User } from '../user/user.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemModule } from '../item/item.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyTask,
      User,
    ]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    InventoryModule,
    ItemModule,
  ],
  controllers: [
    DailyTaskController,
  ],
  providers: [
    DailyTaskService,
  ],
  exports: [
    DailyTaskService,
  ],
})
export class DailyTaskModule {}