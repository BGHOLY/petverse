
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EconomyModule } from '../economy/economy.module';
import { Pet } from '../pet/pet.entity';
import { User } from '../user/user.entity';
import { PetCapacityController } from './pet-capacity.controller';
import { PetCapacityService } from './pet-capacity.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Pet]),
    EconomyModule,
  ],
  controllers: [PetCapacityController],
  providers: [PetCapacityService],
  exports: [PetCapacityService],
})
export class PetCapacityModule {}
