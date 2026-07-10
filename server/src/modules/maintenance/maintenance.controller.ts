import { Controller, Post } from '@nestjs/common';

import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
  ) {}

  @Post('run')
  run() {
    return this.maintenanceService.run();
  }
}
