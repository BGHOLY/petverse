import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_USER_ID } from '../game-data';
import { PET_SPECIES_CONFIGS } from './config/pet-species.config';
import { PetService } from './pet.service';

@Controller('pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  getMyPetsForBeta() {
    return this.petService.getUserPets(DEFAULT_USER_ID);
  }

  @Get('all')
  getAllPets() {
    return this.petService.getAllPets();
  }

  @Get('my')
  getMyPets() {
    return this.petService.getUserPets(DEFAULT_USER_ID);
  }

  @Get('my-auth')
  @UseGuards(JwtAuthGuard)
  getMyPetsWithAuth(@Req() req: any) {
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
    try {
      const pet = await this.petService.createPet(
        DEFAULT_USER_ID,
        {
          nickname: body?.nickname,
          species: body?.species,
          speciesCode: body?.speciesCode,
          isMutant: Boolean(body?.isMutant),
          isLocked: Boolean(body?.isLocked),
          isFavorite: Boolean(body?.isFavorite),
          gender: body?.gender,
          rarity: Number(body?.rarity || 1),
          quality:
            body?.quality === undefined
              ? undefined
              : Number(body.quality),
          skillSlotCount:
            body?.skillSlotCount === undefined
              ? undefined
              : Number(body.skillSlotCount),
          aptitudes: body?.aptitudes,
          growth:
            body?.growth === undefined
              ? undefined
              : Number(body.growth),
          bodyType: body?.bodyType,
          color: body?.color,
          pattern: body?.pattern,
          sourceType: body?.sourceType || 'created',
        },
      );

      return {
        success: true,
        pet,
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message || 'Create pet failed',
        ),
      };
    }
  }

  @Post('rename')
  renamePet(@Body() body: any) {
    return this.petService.renamePet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      String(body?.nickname || ''),
    );
  }

  @Post('lock')
  setPetLock(@Body() body: any) {
    return this.petService.setPetLock(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      body?.locked !== false,
    );
  }

  @Post('favorite')
  setPetFavorite(@Body() body: any) {
    return this.petService.setPetFavorite(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      body?.favorite !== false,
    );
  }

  @Post('release')
  releasePet(@Body() body: any) {
    return this.petService.releasePet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
    );
  }

  @Post('feed')
  feedPet(@Body() body: any) {
    return this.petService.feedPet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0) || undefined,
    );
  }

  @Post('level-up')
  levelUp(@Body() body: any) {
    return this.petService.levelUpPet(
      DEFAULT_USER_ID,
      Number(body?.petId || 0) || undefined,
      Number(body?.exp || 100),
    );
  }

  @Post('hatch-starter')
  hatchStarterEgg() {
    return this.petService.hatchStarterEgg(DEFAULT_USER_ID);
  }

  @Post('stats/allocate')
  allocateStats(@Body() body: any) {
    return this.petService.allocateStatPoints(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      body?.points || body || {},
    );
  }

  @Post('stats/recommend')
  recommendStats(@Body() body: any) {
    return this.petService.applyRecommendedStatPoints(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
      String(body?.template || 'auto'),
    );
  }

  @Post('stats/reset')
  resetStats(@Body() body: any) {
    return this.petService.resetStatPoints(
      DEFAULT_USER_ID,
      Number(body?.petId || 0),
    );
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
      message: data
        ? 'Pet detail loaded'
        : 'Pet not found',
      data,
    };
  }
}
