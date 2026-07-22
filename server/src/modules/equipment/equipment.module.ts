import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pet } from '../pet/pet.entity';
import { EquipmentController } from './equipment.controller';
import { EquipmentItem } from './equipment.entity';
import { EquipmentService } from './equipment.service';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentItem, Pet])],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService, TypeOrmModule],
})
export class EquipmentModule {}
