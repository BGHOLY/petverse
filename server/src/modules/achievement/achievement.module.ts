import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { Achievement } from './achievement.entity';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';

import { User } from '../user/user.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { Item } from '../item/item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      User,
      Item,
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
  ],
  controllers: [AchievementController],
  providers: [AchievementService],
})
export class AchievementModule {}