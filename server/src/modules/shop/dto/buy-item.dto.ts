import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class BuyItemDto {
  @Type(() => Number)
  @IsInt()
  shopItemId: number;
}