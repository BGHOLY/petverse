import {
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HandleFriendRequestDto {
  @Type(() => Number)
  @IsInt()
  requestId: number;

  @IsBoolean()
  accept: boolean;
}