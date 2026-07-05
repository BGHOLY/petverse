import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ClaimMailDto {
  @Type(() => Number)
  @IsInt()
  mailId: number;
}