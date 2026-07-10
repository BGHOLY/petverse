import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { PET_SPECIES_CONFIGS } from './config/pet-species.config';
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

  @Get('config/species')
  getSpeciesConfig() {
    return {
      success: true,
      count: PET_SPECIES_CONFIGS.length,
      species: PET_SPECIES_CONFIGS,
    };
  }

  @Post('create')
  async createPet(@Body() body: any) {
    const pet = await this.petService.createPet(DEFAULT_USER_ID, {
      nickname: body?.nickname,
      species: body?.species,
      speciesCode: body?.speciesCode,
      isMutant: Boolean(body?.isMutant),
      rarity: Number(body?.rarity || 1),
      quality: body?.quality === undefined ? undefined : Number(body.quality),
      skillSlotCount:
        body?.skillSlotCount === undefined
          ? undefined
          : Number(body.skillSlotCount),
      aptitudes: body?.aptitudes,
      growth:
        body?.growth === undefined ? undefined : Number(body.growth),
      bodyType: body?.bodyType,
      color: body?.color,
      pattern: body?.pattern,
      sourceType: body?.sourceType || 'created',
    });

    return {
      success: true,
      pet,
    };
  }

  @Post('feed')
  async feedPet(@Body() body: any) {
    return this.petService.feedPet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0) || undefined,
    );
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

  @Get(':id')
  async getPetDetail(@Param('id') id: string) {
    const petId = Number(id);

    if (!Number.isInteger(petId) || petId <= 0) {
      return {
        success: false,
        message: 'Invalid pet id',
        data: null,
      };
    }

    const data = await this.petService.getPetDetail(petId);

    return {
      success: Boolean(data),
      message: data ? 'Pet detail loaded' : 'Pet not found',
      data,
    };
  }
}
