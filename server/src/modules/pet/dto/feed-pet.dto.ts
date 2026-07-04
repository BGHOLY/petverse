import { IsNumber, IsString } from 'class-validator';

export class FeedPetDto {
  @IsNumber()
  petId: number;

  @IsString()
  itemCode: string;
}