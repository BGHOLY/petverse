import { Body, Controller, Get, Post } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../game-data';
import { GuildService } from './guild.service';

@Controller('guild')
export class GuildController {
  constructor(private readonly guildService: GuildService) {}

  @Get('my')
  myGuild() { return this.guildService.getMyGuild(DEFAULT_USER_ID); }

  @Post('create')
  create(@Body() body: any) { return this.guildService.createGuild(DEFAULT_USER_ID, String(body?.name || '')); }

  @Post('join-default')
  joinDefault() { return this.guildService.joinDefault(DEFAULT_USER_ID); }

  @Post('sign')
  sign() { return this.guildService.signIn(DEFAULT_USER_ID); }

  @Post('donate')
  donate(@Body() body: any) { return this.guildService.donate(DEFAULT_USER_ID, String(body?.type || 'gold'), Number(body?.amount || 1000)); }

  @Get('tasks')
  tasks() { return this.guildService.getTasks(DEFAULT_USER_ID); }

  @Post('tasks/claim')
  claimTask(@Body() body: any) { return this.guildService.claimTask(DEFAULT_USER_ID, Number(body?.taskId || 0)); }

  @Get('boss')
  boss() { return this.guildService.bossStatus(DEFAULT_USER_ID); }

  @Post('boss/challenge')
  challengeBoss() { return this.guildService.challengeBoss(DEFAULT_USER_ID); }

  @Get('shop')
  shop() { return this.guildService.shop(DEFAULT_USER_ID); }

  @Post('shop/buy')
  buy(@Body() body: any) { return this.guildService.buyShopItem(DEFAULT_USER_ID, String(body?.itemCode || '')); }

  @Post('expedition/start')
  startExpedition(@Body() body: any) {
    return this.guildService.startExpedition(DEFAULT_USER_ID, Array.isArray(body?.petIds) ? body.petIds : [], String(body?.routeCode || 'forest'));
  }

  @Post('expedition/claim')
  claimExpedition(@Body() body: any) {
    return this.guildService.claimExpedition(DEFAULT_USER_ID, Number(body?.expeditionId || 0), Boolean(body?.force));
  }

  @Get('help')
  help() { return this.guildService.getHelp(DEFAULT_USER_ID); }

  @Post('help/request')
  requestHelp(@Body() body: any) { return this.guildService.requestHelp(DEFAULT_USER_ID, String(body?.resourceCode || 'hatch_accelerator')); }

  @Post('help/donate')
  donateHelp(@Body() body: any) { return this.guildService.donateHelp(DEFAULT_USER_ID, Number(body?.requestId || 0)); }
}
