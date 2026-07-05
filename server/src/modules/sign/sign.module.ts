import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { SignRecord } from './sign-record.entity';
import { SignController } from './sign.controller';
import { SignService } from './sign.service';

import { User } from '../user/user.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemModule } from '../item/item.module';
import { DailyTaskModule } from '../daily-task/daily-task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignRecord, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    InventoryModule,
    ItemModule,
    DailyTaskModule,
  ],
  controllers: [SignController],
  providers: [SignService],
})
export class SignModule {}