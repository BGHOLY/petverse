import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { Inventory } from './inventory.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ItemModule } from '../item/item.module';
import { Pet } from '../pet/pet.entity';
import { Item } from '../item/item.entity';
import { EggModule } from '../egg/egg.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, Pet, Item]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    ItemModule,
    EggModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [
    TypeOrmModule,
    InventoryService,
  ],
})
export class InventoryModule {}
