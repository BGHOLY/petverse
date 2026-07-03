import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  openid: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}