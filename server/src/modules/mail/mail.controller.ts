import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { resolveRequestUserId } from '../../common/request-user.util';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  getMails(@Headers('x-user-id') userId?: string) {
    return this.mailService.getMyMails(resolveRequestUserId(userId));
  }

  @Get('list')
  getMyMails(@Headers('x-user-id') userId?: string) {
    return this.mailService.getMyMails(resolveRequestUserId(userId));
  }

  @Post('read')
  markRead(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.mailService.markRead(resolveRequestUserId(userId), Number(body?.mailId || 0));
  }

  @Post('read-all')
  readAll(@Headers('x-user-id') userId?: string) {
    return this.mailService.readAll(resolveRequestUserId(userId));
  }

  @Post('claim')
  claimMail(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.mailService.claimMail(
      resolveRequestUserId(userId),
      Number(body?.mailId || 0),
      String(body?.requestId || ''),
    );
  }

  @Post('claim-all')
  claimAll(@Headers('x-user-id') userId: string, @Body() body: any) {
    return this.mailService.claimAll(
      resolveRequestUserId(userId),
      String(body?.requestId || ''),
    );
  }

  @Post('delete-claimed')
  deleteClaimed(@Headers('x-user-id') userId?: string) {
    return this.mailService.deleteClaimed(resolveRequestUserId(userId));
  }

  @Post('seed-welcome')
  seedWelcome(@Headers('x-user-id') userId?: string) {
    return this.mailService.seedWelcomeMail(resolveRequestUserId(userId));
  }

  @Post('test-send')
  testSend(@Headers('x-user-id') userId?: string) {
    this.assertDevelopmentTools();
    const currentUserId = resolveRequestUserId(userId);
    return this.mailService.createMailWithAttachments(
      currentUserId,
      '系统测试奖励',
      '附件包含金币、钻石和道具，用于验证多附件领取。',
      [
        { type: 'gold', quantity: 100 },
        { type: 'diamond', quantity: 5 },
        { type: 'item', itemCode: 'exp_potion_small', quantity: 2 },
      ],
      {
        sourceType: 'test',
        sourceId: `test-${currentUserId}-${Date.now()}`,
      },
    );
  }

  @Post('admin/send')
  adminSend(@Body() body: any) {
    this.assertDevelopmentTools();
    const userId = Number(body?.userId || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenException('Invalid target user');
    }
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;
    return this.mailService.createMailWithAttachments(
      userId,
      String(body?.title || '系统补偿'),
      String(body?.content || ''),
      Array.isArray(body?.attachments) ? body.attachments : [],
      {
        sourceType: String(body?.sourceType || 'admin-compensation'),
        sourceId: String(body?.sourceId || ''),
        idempotencyKey: String(body?.idempotencyKey || ''),
        expiresAt: expiresAt && Number.isFinite(expiresAt.getTime()) ? expiresAt : null,
      },
    );
  }

  private assertDevelopmentTools() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Development mail tools are disabled');
    }
  }
}
