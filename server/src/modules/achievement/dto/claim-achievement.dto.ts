import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ClaimAchievementDto {
  @Type(() => Number)
  @IsInt()
  achievementId: number;
}