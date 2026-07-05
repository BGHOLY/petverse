import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('sign_records')
export class SignRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  // 连续签到天数
  @Column({ default: 0 })
  continuousDays: number;

  // 累计签到天数
  @Column({ default: 0 })
  totalDays: number;

  // 最后签到时间
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastSignTime: Date;

  @CreateDateColumn()
  createTime: Date;
}