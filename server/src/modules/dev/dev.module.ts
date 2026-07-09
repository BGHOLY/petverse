import { Module } from '@nestjs/common';

import { FriendModule } from '../friend/friend.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemModule } from '../item/item.module';
import { PetModule } from '../pet/pet.module';
import { ShopModule } from '../shop/shop.module';
import { SkillModule } from '../skill/skill.module';
import { TowerModule } from '../tower/tower.module';
import { UserModule } from '../user/user.module';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';

@Module({
  imports: [
    UserModule,
    ItemModule,
    ShopModule,
    SkillModule,
    PetModule,
    FriendModule,
    InventoryModule,
    TowerModule,
  ],
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}
