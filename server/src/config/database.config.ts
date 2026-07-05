import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

import { User } from '../modules/user/user.entity';
import { Pet } from '../modules/pet/pet.entity';
import { Item } from '../modules/item/item.entity';
import { Inventory } from '../modules/inventory/inventory.entity';
import { Battle } from '../modules/battle/battle.entity';
import { TowerRecord } from '../modules/tower/tower-record.entity';
import { SignRecord } from '../modules/sign/sign-record.entity';
import { DailyTask } from '../modules/daily-task/daily-task.entity';
import { OfflineReward } from '../modules/offline-reward/offline-reward.entity';

dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'petverse',

  entities: [
  User,
  Pet,
  Item,
  Inventory,
  Battle,
  TowerRecord,
  SignRecord,
  DailyTask,
  OfflineReward,
],
  synchronize: true,
};