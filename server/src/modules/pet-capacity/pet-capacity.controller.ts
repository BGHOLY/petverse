import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { PetCapacityService } from './pet-capacity.service';

@Controller('pet-capacity')
export class PetCapacityController {
  constructor(
    private readonly petCapacityService: PetCapacityService,
  ) {}

  @Get()
  getStatus(@Headers('x-user-id') userId?: string) {
    return this.petCapacityService.getStatus(resolveRequestUserId(userId));
  }

  @Post('expand')
  expand(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.petCapacityService.expandCapacity(
      resolveRequestUserId(userId),
      String(body?.requestId || ''),
    );
  }
}
