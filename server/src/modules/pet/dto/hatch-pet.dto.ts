import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class HatchPetDto {
  @Type(() => Number)
  @IsInt()
  petId: number;
}