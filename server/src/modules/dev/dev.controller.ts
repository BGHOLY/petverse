import { Controller, Post } from '@nestjs/common';

import { DevService } from './dev.service';

@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Post('seed-all')
  async seedAll() {
    return this.devService.seedAll();
  }

  @Post('seed-hatchery')
  async seedHatchery() {
    return this.devService.seedHatchery();
  }

  @Post('seed-social')
  async seedSocial() {
    return this.devService.seedSocial();
  }
}
