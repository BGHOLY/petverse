import { Module } from '@nestjs/common';

import { AchievementModule } from '../achievement/achievement.module';
import { EconomyModule } from '../economy/economy.module';
import { FriendModule } from '../friend/friend.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ItemModule } from '../item/item.module';
import { MailModule } from '../mail/mail.module';
import { PetCapacityModule } from '../pet-capacity/pet-capacity.module';
import { PetModule } from '../pet/pet.module';
import { ShopModule } from '../shop/shop.module';
import { SeasonModule } from '../season/season.module';
import { SkillModule } from '../skill/skill.module';
import { TeamModule } from '../team/team.module';
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
    EconomyModule,
    TeamModule,
    AchievementModule,
    MailModule,
    SeasonModule,
    PetCapacityModule,
  ],
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}
