import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class BreedPetDto {
  @Type(() => Number)
  @IsInt()
  petId: number;
}