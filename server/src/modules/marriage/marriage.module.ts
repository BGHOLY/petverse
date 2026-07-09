import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EggModule } from '../egg/egg.module';
import { Pet } from '../pet/pet.entity';
import { MarriageController } from './marriage.controller';
import { Marriage } from './marriage.entity';
import { MarriageService } from './marriage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Marriage, Pet]), EggModule],
  controllers: [MarriageController],
  providers: [MarriageService],
  exports: [MarriageService],
})
export class MarriageModule {}
