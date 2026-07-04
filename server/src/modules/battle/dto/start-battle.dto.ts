import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class StartBattleDto {
  @Type(() => Number)
  @IsInt()
  myPetId: number;

  @Type(() => Number)
  @IsInt()
  targetPetId: number;
}