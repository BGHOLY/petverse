import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { User } from '../user/user.entity';
import { Pet } from '../pet/pet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Pet]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}