import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  async list(@Headers('x-user-id') userId?: string) {
    const equipment = await this.equipmentService.list(resolveRequestUserId(userId));
    return { success: true, equipment, items: equipment, data: equipment };
  }

  @Get('pet/:petId')
  forPet(@Headers('x-user-id') userId: string, @Param('petId') petId: string) {
    return this.equipmentService.forPet(resolveRequestUserId(userId), Number(petId || 0));
  }

  @Post('equip')
  equip(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.equipmentService.equip(resolveRequestUserId(userId), Number(body?.equipmentId || 0), Number(body?.petId || 0));
  }

  @Post('unequip')
  unequip(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.equipmentService.unequip(resolveRequestUserId(userId), Number(body?.equipmentId || 0));
  }

  @Post('dev/seed')
  seed(@Headers('x-user-id') userId?: string) {
    return this.equipmentService.seed(resolveRequestUserId(userId));
  }
}
