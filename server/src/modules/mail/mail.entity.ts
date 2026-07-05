import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('mails')
export class Mail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({
    type: 'text',
  })
  content: string;

  @Column({
    nullable: true,
  })
  rewardType: string;

  @Column({
    nullable: true,
  })
  rewardValue: string;

  @Column({
    default: false,
  })
  claimed: boolean;

  @Column({
    default: false,
  })
  readed: boolean;

  @CreateDateColumn()
  createTime: Date;
}