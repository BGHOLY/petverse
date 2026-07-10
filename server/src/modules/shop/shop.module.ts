import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Item } from '../item/item.entity';
import { ItemModule } from '../item/item.module';
import { ShopController } from './shop.controller';
import { ShopItem } from './shop-item.entity';
import { ShopService } from './shop.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopItem,
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
    ItemModule,
    InventoryModule,
    EconomyModule,
  ],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
