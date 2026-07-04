import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class MarryPetDto {
  @Type(() => Number)
  @IsInt()
  petId: number;

  @Type(() => Number)
  @IsInt()
  targetPetId: number;
}