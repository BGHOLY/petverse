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
import { Friend } from '../modules/friend/friend.entity';
import { FriendRequest } from '../modules/friend/friend-request.entity';
import { Mail } from '../modules/mail/mail.entity';
import { ShopItem } from '../modules/shop/shop-item.entity';
import { Achievement } from '../modules/achievement/achievement.entity';
import { Skill } from '../modules/skill/skill.entity';
import { SkillLearningLog } from '../modules/skill/skill-learning-log.entity';
import { Marriage } from '../modules/marriage/marriage.entity';
import { Egg } from '../modules/egg/egg.entity';
import { FusionRecord } from '../modules/fusion/fusion-record.entity';

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
    Friend,
    FriendRequest,
    Mail,
    ShopItem,
    Achievement,
    Skill,
    SkillLearningLog,
    Marriage,
    Egg,
    FusionRecord,
  ],
  synchronize: true,
};
