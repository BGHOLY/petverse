import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { FusionService } from './fusion.service';

@Controller('fusion')
export class FusionController {
  constructor(
    private readonly fusionService: FusionService,
  ) {}

  @Post('preview')
  preview(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.fusionService.preview(
      resolveRequestUserId(userId),
      Number(
        body?.parentAId ||
          body?.petAId ||
          0,
      ),
      Number(
        body?.parentBId ||
          body?.petBId ||
          0,
      ),
      body?.seed
        ? String(body.seed)
        : undefined,
      Boolean(body?.useMutationEssence),
      Array.isArray(body?.lockedSkillCodes)
        ? body.lockedSkillCodes.map(String)
        : [],
    );
  }

  @Post('execute')
  execute(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.fusionService.execute(
      resolveRequestUserId(userId),
      Number(
        body?.parentAId ||
          body?.petAId ||
          0,
      ),
      Number(
        body?.parentBId ||
          body?.petBId ||
          0,
      ),
      String(body?.requestId || ''),
      body?.seed
        ? String(body.seed)
        : undefined,
      Boolean(body?.useMutationEssence),
      Array.isArray(body?.lockedSkillCodes)
        ? body.lockedSkillCodes.map(String)
        : [],
    );
  }

  @Get('history')
  getHistory(@Headers('x-user-id') userId?: string) {
    return this.fusionService.getHistory(
      resolveRequestUserId(userId),
    );
  }
}
