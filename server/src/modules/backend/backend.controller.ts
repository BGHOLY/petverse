import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { BackendService } from './backend.service';

@Controller('backend')
export class BackendController {
  constructor(
    private readonly backendService: BackendService,
  ) {}

  @Get('status')
  status() {
    return this.backendService.status();
  }

  @Post('verify')
  verify() {
    return this.backendService.verifyConfig();
  }
}
