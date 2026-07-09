import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { databaseConfig } from './config/database.config';

import { PetModule } from './modules/pet/pet.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ItemModule } from './modules/item/item.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BattleModule } from './modules/battle/battle.module';
import { TowerModule } from './modules/tower/tower.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { SignModule } from './modules/sign/sign.module';
import { DailyTaskModule } from './modules/daily-task/daily-task.module';
import { OfflineRewardModule } from './modules/offline-reward/offline-reward.module';
import { FriendModule } from './modules/friend/friend.module';
import { MailModule } from './modules/mail/mail.module';
import { ShopModule } from './modules/shop/shop.module';
import { AchievementModule } from './modules/achievement/achievement.module';
import { SkillModule } from './modules/skill/skill.module';
import { EggModule } from './modules/egg/egg.module';
import { MarriageModule } from './modules/marriage/marriage.module';
import { HatcheryModule } from './modules/hatchery/hatchery.module';
import { DevModule } from './modules/dev/dev.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot(databaseConfig),

    PetModule,
    UserModule,
    AuthModule,
    ItemModule,
    InventoryModule,
    TowerModule,
    BattleModule,
    RankingModule,
    SignModule,
    DailyTaskModule,
    OfflineRewardModule,
    FriendModule,
    MailModule,
    ShopModule,
    AchievementModule,
    SkillModule,
    EggModule,
    MarriageModule,
    HatcheryModule,
    DevModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
