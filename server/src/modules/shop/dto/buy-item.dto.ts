import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BuyItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shopItemId?: number;

  @IsOptional()
  @IsString()
  itemCode?: string;
}
