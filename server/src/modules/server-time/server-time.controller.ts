import { Controller, Get } from '@nestjs/common';

import { ServerTimeService } from './server-time.service';

@Controller('server-time')
export class ServerTimeController {
  constructor(private readonly serverTime: ServerTimeService) {}

  @Get()
  getClock() {
    return {
      success: true,
      ...this.serverTime.clock(),
    };
  }
}
