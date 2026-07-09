import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { Pet } from './pet.entity';
import { PetController } from './pet.controller';
import { PetService } from './pet.service';
import { SkillModule } from '../skill/skill.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pet]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    SkillModule,
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [TypeOrmModule, PetService],
})
export class PetModule {}
