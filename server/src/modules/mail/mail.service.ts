import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Mail } from './mail.entity';
import { User } from '../user/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { Item } from '../item/item.entity';

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    private readonly inventoryService: InventoryService,
  ) {}

  async getMyMails(userId: number) {
    return this.mailRepository.find({
      where: { userId },
      order: {
        id: 'DESC',
      },
    });
  }

  async createSystemMail(
    userId: number,
    title: string,
    content: string,
    rewardType = '',
    rewardValue = '',
  ) {
    const mail = this.mailRepository.create({
      userId,
      title,
      content,
      rewardType,
      rewardValue,
      claimed: false,
      readed: false,
    });

    return this.mailRepository.save(mail);
  }

  async markRead(userId: number, mailId: number) {
    const mail = await this.mailRepository.findOne({
      where: {
        id: mailId,
        userId,
      },
    });

    if (!mail) {
      return {
        success: false,
        message: '邮件不存在',
      };
    }

    mail.readed = true;
    await this.mailRepository.save(mail);

    return {
      success: true,
      message: '邮件已读',
      mail,
    };
  }

  async claimMail(userId: number, mailId: number) {
    const mail = await this.mailRepository.findOne({
      where: {
        id: mailId,
        userId,
      },
    });

    if (!mail) {
      return {
        success: false,
        message: '邮件不存在',
      };
    }

    if (mail.claimed) {
      return {
        success: false,
        message: '奖励已领取',
      };
    }

    if (!mail.rewardType || !mail.rewardValue) {
      mail.claimed = true;
      mail.readed = true;
      await this.mailRepository.save(mail);

      return {
        success: true,
        message: '邮件无附件，已标记领取',
        mail,
      };
    }

    if (mail.rewardType === 'gold') {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在',
        };
      }

      const gold = Number(mail.rewardValue || 0);
      user.gold += gold;
      await this.userRepository.save(user);
    }

    if (mail.rewardType === 'item') {
      const item = await this.itemRepository.findOne({
        where: {
          itemCode: mail.rewardValue,
        },
      });

      if (item) {
        await this.inventoryService.addItem(
          userId,
          item.id,
          item.itemCode,
          1,
        );
      }
    }

    mail.claimed = true;
    mail.readed = true;

    const saved = await this.mailRepository.save(mail);

    return {
      success: true,
      message: '邮件奖励领取成功',
      mail: saved,
    };
  }
}