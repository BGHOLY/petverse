import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Egg } from './egg.entity';
import { EggService } from './egg.service';

@Module({
  imports: [TypeOrmModule.forFeature([Egg])],
  providers: [EggService],
  exports: [TypeOrmModule, EggService],
})
export class EggModule {}
