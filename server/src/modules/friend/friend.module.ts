import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { Friend } from './friend.entity';
import { FriendRequest } from './friend-request.entity';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';

import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Friend,
      FriendRequest,
      User,
    ]),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'petverse_dev_secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}