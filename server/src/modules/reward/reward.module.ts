import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EggModule } from '../egg/egg.module';
import { EconomyModule } from '../economy/economy.module';
import { EquipmentItem } from '../equipment/equipment.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Pet } from '../pet/pet.entity';
import { User } from '../user/user.entity';
import { RewardClaim } from './reward-claim.entity';
import { RewardService } from './reward.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardClaim,
      User,
      Inventory,
      Pet,
      EquipmentItem,
    ]),
    EconomyModule,
    EggModule,
  ],
  providers: [RewardService],
  exports: [RewardService, TypeOrmModule],
})
export class RewardModule {}
