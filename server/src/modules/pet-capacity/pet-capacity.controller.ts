
import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { PetCapacityService } from './pet-capacity.service';

@Controller('pet-capacity')
export class PetCapacityController {
  constructor(
    private readonly petCapacityService: PetCapacityService,
  ) {}

  @Get()
  getStatus() {
    return this.petCapacityService.getStatus(DEFAULT_USER_ID);
  }

  @Post('expand')
  expand(@Body() body: any) {
    return this.petCapacityService.expandCapacity(
      DEFAULT_USER_ID,
      String(body?.requestId || ''),
    );
  }
}
