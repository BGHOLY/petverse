
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { PetCapacityModule } from '../pet-capacity/pet-capacity.module';
import { Pet } from '../pet/pet.entity';
import { PetTeam } from '../team/pet-team.entity';
import { User } from '../user/user.entity';
import { TradeController } from './trade.controller';
import { TradeListing } from './trade-listing.entity';
import { TradeRecord } from './trade-record.entity';
import { TradeService } from './trade.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TradeListing,
      TradeRecord,
      Pet,
      PetTeam,
      User,
    ]),
    EconomyModule,
    PetCapacityModule,
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradeModule {}
