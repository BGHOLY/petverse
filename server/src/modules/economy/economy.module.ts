import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inventory } from '../inventory/inventory.entity';
import { Item } from '../item/item.entity';
import { User } from '../user/user.entity';
import { EconomyController } from './economy.controller';
import { EconomyService } from './economy.service';
import { GameOperationRecord } from './game-operation-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Inventory,
      Item,
      GameOperationRecord,
    ]),
  ],
  controllers: [EconomyController],
  providers: [EconomyService],
  exports: [EconomyService, TypeOrmModule],
})
export class EconomyModule {}
