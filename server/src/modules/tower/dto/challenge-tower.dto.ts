import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ChallengeTowerDto {
  @Type(() => Number)
  @IsInt()
  petId: number;
}