
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface MailAttachment {
  type: 'gold' | 'diamond' | 'item';
  itemCode?: string;
  quantity: number;
}

@Entity('mails')
@Index(['userId', 'claimed'])
export class Mail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  // 兼容旧邮件字段。
  @Column({ nullable: true })
  rewardType: string;

  @Column({ nullable: true })
  rewardValue: string;

  @Column({ type: 'simple-json', nullable: true })
  attachments: MailAttachment[];

  @Column({ default: 'system' })
  sourceType: string;

  @Column({ default: '' })
  sourceId: string;

  @Column({ default: false })
  claimed: boolean;

  @Column({ default: false })
  readed: boolean;

  @Column({ default: '' })
  claimRequestId: string;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
