import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveRequestUserId } from '../../common/request-user.util';
import { PET_SPECIES_CONFIGS } from './config/pet-species.config';
import { PetService } from './pet.service';

@Controller('pet')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  getMyPetsForBeta(@Headers('x-user-id') userId?: string) {
    return this.petService.getUserPets(resolveRequestUserId(userId));
  }

  @Get('all')
  getAllPets() {
    return this.petService.getAllPets();
  }

  @Get('my')
  getMyPets(@Headers('x-user-id') userId?: string) {
    return this.petService.getUserPets(resolveRequestUserId(userId));
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
  async createPet(@Headers('x-user-id') userId: string, @Body() body: any) {
    try {
      const pet = await this.petService.createPet(
        resolveRequestUserId(userId),
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
  renamePet(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.renamePet(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      String(body?.nickname || ''),
    );
  }

  @Post('lock')
  setPetLock(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.setPetLock(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      body?.locked !== false,
    );
  }

  @Post('favorite')
  setPetFavorite(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.setPetFavorite(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      body?.favorite !== false,
    );
  }

  @Post('release')
  releasePet(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.releasePet(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
    );
  }

  @Post('feed')
  feedPet(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.feedPet(
      resolveRequestUserId(userId),
      Number(body?.petId || 0) || undefined,
    );
  }

  @Post('level-up')
  levelUp(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.levelUpPet(
      resolveRequestUserId(userId),
      Number(body?.petId || 0) || undefined,
      Number(body?.exp || 100),
    );
  }

  @Post('hatch-starter')
  hatchStarterEgg(@Headers('x-user-id') userId?: string) {
    return this.petService.hatchStarterEgg(resolveRequestUserId(userId));
  }

  @Post('stats/allocate')
  allocateStats(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.allocateStatPoints(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      body?.points || body || {},
    );
  }

  @Post('stats/recommend')
  recommendStats(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.applyRecommendedStatPoints(
      resolveRequestUserId(userId),
      Number(body?.petId || 0),
      String(body?.template || 'auto'),
    );
  }

  @Post('stats/reset')
  resetStats(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.petService.resetStatPoints(
      resolveRequestUserId(userId),
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
