
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import {
  EconomyReward,
  EconomyService,
} from '../economy/economy.service';
import {
  Mail,
  MailAttachment,
} from './mail.entity';

interface CreateMailOptions {
  sourceType?: string;
  sourceId?: string;
  expiresAt?: Date | null;
}

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(Mail)
    private readonly mailRepository: Repository<Mail>,

    private readonly economyService: EconomyService,
    private readonly dataSource: DataSource,
  ) {}

  async getMyMails(userId: number) {
    const mails = await this.mailRepository.find({
      where: { userId },
      order: { id: 'DESC' },
    });
    const data = mails.map((mail) => this.toMailView(mail));

    return {
      success: true,
      unreadCount: data.filter((mail) => !mail.readed).length,
      claimableCount: data.filter((mail) => mail.canClaim).length,
      mails: data,
      data,
    };
  }

  async createSystemMail(
    userId: number,
    title: string,
    content: string,
    rewardType = '',
    rewardValue = '',
  ) {
    return this.createMailWithAttachments(
      userId,
      title,
      content,
      this.legacyAttachments(rewardType, rewardValue),
      {
        sourceType: 'system',
      },
      rewardType,
      rewardValue,
    );
  }

  async createMailWithAttachments(
    userId: number,
    title: string,
    content: string,
    attachments: MailAttachment[],
    options: CreateMailOptions = {},
    rewardType = '',
    rewardValue = '',
  ) {
    const normalized = this.normalizeAttachments(attachments);
    const mail = this.mailRepository.create({
      userId,
      title: String(title || '系统邮件').slice(0, 100),
      content: String(content || ''),
      rewardType,
      rewardValue,
      attachments: normalized,
      sourceType: options.sourceType || 'system',
      sourceId: String(options.sourceId || '').slice(0, 100),
      claimed: false,
      readed: false,
      claimRequestId: '',
      claimedAt: null,
      expiresAt: options.expiresAt || null,
    });

    return this.mailRepository.save(mail);
  }

  async seedWelcomeMail(userId: number) {
    const sourceId = 'welcome-v2.2';
    const existing = await this.mailRepository.findOne({
      where: {
        userId,
        sourceType: 'welcome',
        sourceId,
      },
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        mail: this.toMailView(existing),
      };
    }

    const mail = await this.createMailWithAttachments(
      userId,
      'PetVerse 后端 V2.2 奖励',
      '真实好友、邮件附件、赛季、排行榜结算、交易和宝宝容量系统已经启用。',
      [
        { type: 'gold', quantity: 3000 },
        { type: 'diamond', quantity: 50 },
        {
          type: 'item',
          itemCode: 'pet_capacity_ticket',
          quantity: 1,
        },
        {
          type: 'item',
          itemCode: 'season_token',
          quantity: 10,
        },
      ],
      {
        sourceType: 'welcome',
        sourceId,
      },
    );

    return {
      success: true,
      duplicate: false,
      mail: this.toMailView(mail),
    };
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
        message: 'Mail not found',
      };
    }

    mail.readed = true;
    const saved = await this.mailRepository.save(mail);
    return {
      success: true,
      message: 'Mail marked as read',
      mail: this.toMailView(saved),
    };
  }

  async readAll(userId: number) {
    const mails = await this.mailRepository.find({
      where: { userId },
    });
    const unread = mails.filter((mail) => !mail.readed);
    for (const mail of unread) {
      mail.readed = true;
    }
    if (unread.length) {
      await this.mailRepository.save(unread);
    }

    return {
      success: true,
      message: 'All mails marked as read',
      count: unread.length,
    };
  }

  async claimMail(
    userId: number,
    mailId: number,
    rawRequestId = '',
  ) {
    if (!mailId) {
      return {
        success: false,
        message: 'Invalid mail id',
      };
    }

    const requestId =
      this.economyService.normalizeRequestId(
        rawRequestId,
        `mail-${mailId}`,
      );
    const existing =
      await this.economyService.getOperation(
        userId,
        'mail_claim',
        requestId,
      );

    if (existing?.status === 'success') {
      return {
        success: true,
        duplicate: true,
        requestId,
        ...existing.result,
      };
    }

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const duplicate =
              await this.economyService.getOperationWithManager(
                manager,
                userId,
                'mail_claim',
                requestId,
              );
            if (duplicate?.status === 'success') {
              return {
                duplicate: true,
                response: duplicate.result,
              };
            }

            const mailRepository =
              manager.getRepository(Mail);
            const mail = await mailRepository.findOne({
              where: {
                id: mailId,
                userId,
              },
              lock: {
                mode: 'pessimistic_write',
              },
            });
            if (!mail) {
              throw new Error('Mail not found');
            }

            if (mail.claimed) {
              const response = {
                mail: this.toMailView(mail),
                reward: {},
              };
              return {
                duplicate: true,
                response,
              };
            }
            if (this.isExpired(mail)) {
              throw new Error('Mail has expired');
            }

            const reward = this.attachmentsToReward(
              this.getAttachments(mail),
            );
            const operation =
              duplicate ||
              (await this.economyService.createOperation(
                manager,
                {
                  userId,
                  operationType: 'mail_claim',
                  requestId,
                  reward,
                  payload: {
                    mailId,
                  },
                },
              ));

            await this.economyService.grant(
              manager,
              userId,
              reward,
            );

            mail.claimed = true;
            mail.readed = true;
            mail.claimRequestId = requestId;
            mail.claimedAt = new Date();
            const saved = await mailRepository.save(mail);

            const response = {
              mail: this.toMailView(saved),
              reward,
            };
            await this.economyService.completeOperation(
              manager,
              operation,
              response,
            );

            return {
              duplicate: false,
              response,
            };
          },
        );

      return {
        success: true,
        message: result.duplicate
          ? 'Mail reward already claimed'
          : 'Mail reward claimed',
        duplicate: result.duplicate,
        requestId,
        ...result.response,
        wallet:
          await this.economyService.getWallet(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message || 'Mail claim failed',
        ),
        requestId,
      };
    }
  }

  async claimAll(
    userId: number,
    rawRequestId = '',
  ) {
    const requestId =
      this.economyService.normalizeRequestId(
        rawRequestId,
        'mail-claim-all',
      );
    const existing =
      await this.economyService.getOperation(
        userId,
        'mail_claim_all',
        requestId,
      );
    if (existing?.status === 'success') {
      return {
        success: true,
        duplicate: true,
        requestId,
        ...existing.result,
      };
    }

    try {
      const result =
        await this.dataSource.transaction(
          async (manager) => {
            const duplicate =
              await this.economyService.getOperationWithManager(
                manager,
                userId,
                'mail_claim_all',
                requestId,
              );
            if (duplicate?.status === 'success') {
              return {
                duplicate: true,
                response: duplicate.result,
              };
            }

            const mailRepository =
              manager.getRepository(Mail);
            const mails = await mailRepository.find({
              where: {
                userId,
                claimed: false,
              },
              order: {
                id: 'ASC',
              },
            });
            const claimable = mails.filter(
              (mail) => !this.isExpired(mail),
            );
            const reward: EconomyReward = {
              gold: 0,
              diamond: 0,
              items: {},
            };

            for (const mail of claimable) {
              this.mergeReward(
                reward,
                this.attachmentsToReward(
                  this.getAttachments(mail),
                ),
              );
            }

            const operation =
              duplicate ||
              (await this.economyService.createOperation(
                manager,
                {
                  userId,
                  operationType: 'mail_claim_all',
                  requestId,
                  reward,
                  payload: {
                    mailIds: claimable.map(
                      (mail) => mail.id,
                    ),
                  },
                },
              ));

            if (claimable.length) {
              await this.economyService.grant(
                manager,
                userId,
                reward,
              );

              for (const mail of claimable) {
                mail.claimed = true;
                mail.readed = true;
                mail.claimRequestId = requestId;
                mail.claimedAt = new Date();
              }
              await mailRepository.save(claimable);
            }

            const response = {
              claimedCount: claimable.length,
              mailIds: claimable.map(
                (mail) => mail.id,
              ),
              reward,
            };
            await this.economyService.completeOperation(
              manager,
              operation,
              response,
            );

            return {
              duplicate: false,
              response,
            };
          },
        );

      return {
        success: true,
        message: result.duplicate
          ? 'Claim-all request already completed'
          : 'All claimable mail rewards claimed',
        duplicate: result.duplicate,
        requestId,
        ...result.response,
        wallet:
          await this.economyService.getWallet(userId),
      };
    } catch (error: any) {
      return {
        success: false,
        message: String(
          error?.message ||
            'Claim all mail rewards failed',
        ),
        requestId,
      };
    }
  }

  async deleteClaimed(userId: number) {
    const result = await this.mailRepository.delete({
      userId,
      claimed: true,
    });
    return {
      success: true,
      message: 'Claimed mails deleted',
      affected: Number(result?.affected || 0),
    };
  }

  toMailView(mail: Mail) {
    const expired = this.isExpired(mail);
    const attachments = this.getAttachments(mail);
    return {
      ...mail,
      attachments,
      expired,
      canClaim:
        !mail.claimed &&
        !expired &&
        attachments.length > 0,
    };
  }

  private getAttachments(mail: Mail) {
    const configured = this.normalizeAttachments(
      mail.attachments,
    );
    if (configured.length) return configured;
    return this.legacyAttachments(
      mail.rewardType,
      mail.rewardValue,
    );
  }

  private legacyAttachments(
    rewardType: string,
    rewardValue: string,
  ): MailAttachment[] {
    const type = String(rewardType || '').trim();
    const value = String(rewardValue || '').trim();
    if (!type || !value) return [];

    if (type === 'gold' || type === 'diamond') {
      return [
        {
          type,
          quantity: Math.max(
            0,
            Math.floor(Number(value || 0)),
          ),
        },
      ];
    }

    if (type === 'item') {
      return [
        {
          type: 'item',
          itemCode: value,
          quantity: 1,
        },
      ];
    }
    return [];
  }

  private normalizeAttachments(
    attachments: MailAttachment[],
  ) {
    const result: MailAttachment[] = [];
    for (const raw of Array.isArray(attachments)
      ? attachments
      : []) {
      const type = String(raw?.type || '');
      const quantity = Math.max(
        0,
        Math.floor(Number(raw?.quantity || 0)),
      );
      const itemCode = String(
        raw?.itemCode || '',
      ).trim();

      if (
        quantity <= 0 ||
        !['gold', 'diamond', 'item'].includes(type)
      ) {
        continue;
      }
      if (type === 'item' && !itemCode) {
        continue;
      }

      result.push({
        type: type as
          | 'gold'
          | 'diamond'
          | 'item',
        itemCode:
          type === 'item'
            ? itemCode
            : undefined,
        quantity,
      });
    }
    return result;
  }

  private attachmentsToReward(
    attachments: MailAttachment[],
  ): EconomyReward {
    const reward: EconomyReward = {
      gold: 0,
      diamond: 0,
      items: {},
    };
    for (const attachment of attachments) {
      if (attachment.type === 'gold') {
        reward.gold =
          Number(reward.gold || 0) +
          attachment.quantity;
      } else if (attachment.type === 'diamond') {
        reward.diamond =
          Number(reward.diamond || 0) +
          attachment.quantity;
      } else if (
        attachment.type === 'item' &&
        attachment.itemCode
      ) {
        reward.items[attachment.itemCode] =
          Number(
            reward.items[attachment.itemCode] ||
              0,
          ) + attachment.quantity;
      }
    }
    return reward;
  }

  private mergeReward(
    target: EconomyReward,
    source: EconomyReward,
  ) {
    target.gold =
      Number(target.gold || 0) +
      Number(source.gold || 0);
    target.diamond =
      Number(target.diamond || 0) +
      Number(source.diamond || 0);
    target.items = target.items || {};
    for (const [itemCode, quantity] of Object.entries(
      source.items || {},
    )) {
      target.items[itemCode] =
        Number(target.items[itemCode] || 0) +
        Number(quantity || 0);
    }
  }

  private isExpired(mail: Mail) {
    return Boolean(
      mail.expiresAt &&
        new Date(mail.expiresAt).getTime() <=
          Date.now(),
    );
  }
}
