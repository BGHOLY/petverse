import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { PetService } from './pet.service';

@Controller('pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  async getMyPetsForBeta() {
    return this.petService.getUserPets(DEFAULT_USER_ID);
  }

  @Get('all')
  async getAllPets() {
    return this.petService.getAllPets();
  }

  @Get('my')
  async getMyPets() {
    return this.petService.getUserPets(DEFAULT_USER_ID);
  }

  @Get('my-auth')
  @UseGuards(JwtAuthGuard)
  async getMyPetsWithAuth(@Req() req: any) {
    return this.petService.getUserPets(req.user.sub);
  }

  @Post('create')
  async createPet(@Body() body: any) {
    const pet = await this.petService.createPet(DEFAULT_USER_ID, {
      nickname: body?.nickname,
      species: body?.species,
      rarity: Number(body?.rarity || 1),
    });

    return {
      success: true,
      pet,
    };
  }

  @Post('feed')
  async feedPet(@Body() body: any) {
    return this.petService.feedPet(DEFAULT_USER_ID, Number(body?.petId || 0) || undefined);
  }

  @Post('level-up')
  async levelUp(@Body() body: any) {
    return this.petService.levelUpPet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0) || undefined,
      Number(body?.exp || 100),
    );
  }

  @Post('hatch-starter')
  async hatchStarterEgg() {
    return this.petService.hatchStarterEgg(DEFAULT_USER_ID);
  }
}
