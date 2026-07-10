import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pet } from '../pet/pet.entity';
import { PetModule } from '../pet/pet.module';
import { FusionController } from './fusion.controller';
import { FusionRecord } from './fusion-record.entity';
import { FusionService } from './fusion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pet, FusionRecord]),
    PetModule,
  ],
  controllers: [FusionController],
  providers: [FusionService],
  exports: [FusionService],
})
export class FusionModule {}
