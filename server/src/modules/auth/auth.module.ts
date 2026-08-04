import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { User } from '../user/user.entity';
import { Pet } from '../pet/pet.entity';

import { InventoryModule } from '../inventory/inventory.module';
import { ItemModule } from '../item/item.module';
import { PetModule } from '../pet/pet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Pet]),

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),

    InventoryModule,
    ItemModule,
    PetModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
