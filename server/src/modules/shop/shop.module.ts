import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { ShopItem } from './shop-item.entity';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';

import { User } from '../user/user.entity';
import { Item } from '../item/item.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopItem,
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
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}