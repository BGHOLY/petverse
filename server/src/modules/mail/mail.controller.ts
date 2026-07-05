import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailService } from './mail.service';
import { ClaimMailDto } from './dto/claim-mail.dto';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
  ) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getMyMails(@Req() req: any) {
    return this.mailService.getMyMails(req.user.sub);
  }

  @Post('read')
  @UseGuards(JwtAuthGuard)
  async markRead(
    @Req() req: any,
    @Body() dto: ClaimMailDto,
  ) {
    return this.mailService.markRead(
      req.user.sub,
      dto.mailId,
    );
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  async claimMail(
    @Req() req: any,
    @Body() dto: ClaimMailDto,
  ) {
    return this.mailService.claimMail(
      req.user.sub,
      dto.mailId,
    );
  }

  // 临时测试接口：给自己发一封系统邮件
  @Post('test-send')
  @UseGuards(JwtAuthGuard)
  async testSend(@Req() req: any) {
    return this.mailService.createSystemMail(
      req.user.sub,
      '系统奖励',
      '这是测试邮件，奖励100金币。',
      'gold',
      '100',
    );
  }
}