import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SendFriendRequestDto {
  @Type(() => Number)
  @IsInt()
  targetUserId: number;
}