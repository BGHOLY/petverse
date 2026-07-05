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
    RankingModule,
    SignModule,
    DailyTaskModule,
    OfflineRewardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}