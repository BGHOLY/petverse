
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PetModule } from '../pet/pet.module';
import { User } from '../user/user.entity';
import { FriendController } from './friend.controller';
import { FriendRequest } from './friend-request.entity';
import { Friend } from './friend.entity';
import { FriendService } from './friend.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friend, FriendRequest, User]),
    PetModule,
  ],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
