import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { PetService } from './pet.service';
import { InventoryService } from '../inventory/inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedPetDto } from './dto/feed-pet.dto';

@Controller('pet')
export class PetController {
  constructor(
    private readonly petService: PetService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  getAllPets() {
    return this.petService.getAllPets();
  }

  @Post('feed')
  @UseGuards(JwtAuthGuard)
  async feedPet(
    @Req() req: any,
    @Body() feedDto: FeedPetDto,
  ) {
    const pet = await this.petService.getPetById(
      feedDto.petId,
    );

    if (!pet) {
      return {
        success: false,
        message: '宠物不存在',
      };
    }

    const consume =
      await this.inventoryService.consumeItem(
        req.user.sub,
        feedDto.itemCode,
      );

    if (!consume) {
      return {
        success: false,
        message: '物品不足',
      };
    }

    switch (feedDto.itemCode) {
      case 'apple':
        pet.hunger = Math.min(
          100,
          pet.hunger + 20,
        );
        break;

      case 'fish':
        pet.hunger = Math.min(
          100,
          pet.hunger + 15,
        );
        pet.happiness = Math.min(
          100,
          pet.happiness + 10,
        );
        break;

      default:
        return {
          success: false,
          message: '该物品不能喂食',
        };
    }

    await this.petService.savePet(pet);

    return {
      success: true,
      message: '喂食成功',
      pet,
    };
  }
}