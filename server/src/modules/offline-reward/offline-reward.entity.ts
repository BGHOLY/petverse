import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('offline_rewards')
export class OfflineReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastClaimTime: Date;

  @Column({ default: 0 })
  pendingGold: number;

  @Column({ default: 0 })
  pendingExp: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}