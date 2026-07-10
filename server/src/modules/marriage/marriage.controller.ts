import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { MarriageService } from './marriage.service';

@Controller('marriage')
export class MarriageController {
  constructor(
    private readonly marriageService: MarriageService,
  ) {}

  @Get()
  getMarriages(@Headers('x-user-id') userId?: string) {
    return this.marriageService.getUserMarriages(
      resolveRequestUserId(userId),
    );
  }

  @Get('proposals')
  getProposals(
    @Headers('x-user-id') userId?: string,
    @Query('direction') direction?: string,
  ) {
    const normalized =
      direction === 'incoming' || direction === 'outgoing'
        ? direction
        : 'all';
    return this.marriageService.getProposals(
      resolveRequestUserId(userId),
      normalized,
    );
  }

  @Post('propose')
  propose(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.marriageService.proposeMarriage(
      resolveRequestUserId(userId),
      Number(body?.petAId || body?.ownPetId || 0),
      Number(body?.petBId || body?.targetPetId || 0),
      String(body?.message || ''),
    );
  }

  @Post('proposal/respond')
  respond(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.marriageService.respondProposal(
      resolveRequestUserId(userId),
      Number(body?.proposalId || 0),
      Boolean(body?.accept),
    );
  }

  @Post('proposal/cancel')
  cancelProposal(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.marriageService.cancelProposal(
      resolveRequestUserId(userId),
      Number(body?.proposalId || 0),
    );
  }

  @Post('create')
  createMarriage(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.marriageService.createMarriage(
      resolveRequestUserId(userId),
      Number(body?.petAId || body?.myPetId || body?.ownPetId || 0),
      Number(body?.petBId || body?.friendPetId || body?.targetPetId || 0),
    );
  }

  @Post('lay-egg')
  layEgg(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.marriageService.layEgg(
      resolveRequestUserId(userId),
      Number(body?.marriageId || 0) || undefined,
      Number(body?.petId || body?.petAId || 0) || undefined,
      body?.requestId ? String(body.requestId) : undefined,
    );
  }

  @Post('divorce')
  divorce(
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.marriageService.divorce(
      resolveRequestUserId(userId),
      Number(body?.marriageId || 0),
    );
  }

  @Get('lineage/:petId')
  lineage(
    @Headers('x-user-id') userId: string,
    @Param('petId') petId: string,
  ) {
    return this.marriageService.getPetLineage(
      resolveRequestUserId(userId),
      Number(petId),
    );
  }
}
