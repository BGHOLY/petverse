import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { MarriageService } from './marriage.service';

@Controller('marriage')
export class MarriageController {
  constructor(
    private readonly marriageService: MarriageService,
  ) {}

  @Get()
  getMarriages() {
    return this.marriageService.getUserMarriages(
      DEFAULT_USER_ID,
    );
  }

  @Post('create')
  createMarriage(@Body() body: any) {
    const petAId = Number(
      body?.petAId ||
        body?.myPetId ||
        body?.ownPetId ||
        0,
    );
    const petBId = Number(
      body?.petBId ||
        body?.friendPetId ||
        body?.targetPetId ||
        0,
    );
    return this.marriageService.createMarriage(
      DEFAULT_USER_ID,
      petAId,
      petBId,
    );
  }

  @Post('lay-egg')
  layEgg(@Body() body: any) {
    return this.marriageService.layEgg(
      DEFAULT_USER_ID,
      Number(body?.marriageId || 0) ||
        undefined,
      Number(
        body?.petId ||
          body?.petAId ||
          0,
      ) || undefined,
      body?.requestId
        ? String(body.requestId)
        : undefined,
    );
  }

  @Post('divorce')
  divorce(@Body() body: any) {
    return this.marriageService.divorce(
      DEFAULT_USER_ID,
      Number(body?.marriageId || 0),
    );
  }
}
