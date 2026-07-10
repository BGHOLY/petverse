
import { Body, Controller, Get, Post } from '@nestjs/common';

import { DEFAULT_USER_ID } from '../game-data';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  getMails() {
    return this.mailService.getMyMails(DEFAULT_USER_ID);
  }

  @Get('list')
  getMyMails() {
    return this.mailService.getMyMails(DEFAULT_USER_ID);
  }

  @Post('read')
  markRead(@Body() body: any) {
    return this.mailService.markRead(
      DEFAULT_USER_ID,
      Number(body?.mailId || 0),
    );
  }

  @Post('read-all')
  readAll() {
    return this.mailService.readAll(DEFAULT_USER_ID);
  }

  @Post('claim')
  claimMail(@Body() body: any) {
    return this.mailService.claimMail(
      DEFAULT_USER_ID,
      Number(body?.mailId || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('claim-all')
  claimAll(@Body() body: any) {
    return this.mailService.claimAll(
      DEFAULT_USER_ID,
      String(body?.requestId || ''),
    );
  }

  @Post('delete-claimed')
  deleteClaimed() {
    return this.mailService.deleteClaimed(DEFAULT_USER_ID);
  }

  @Post('seed-welcome')
  seedWelcome() {
    return this.mailService.seedWelcomeMail(DEFAULT_USER_ID);
  }

  @Post('test-send')
  testSend() {
    return this.mailService.createMailWithAttachments(
      DEFAULT_USER_ID,
      '系统测试奖励',
      '附件包含金币、钻石和道具，可验证多附件领取。',
      [
        { type: 'gold', quantity: 100 },
        { type: 'diamond', quantity: 5 },
        {
          type: 'item',
          itemCode: 'exp_potion_small',
          quantity: 2,
        },
      ],
      {
        sourceType: 'test',
        sourceId: `test-${Date.now()}`,
      },
    );
  }
}
