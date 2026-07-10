import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('achievements')
@Index(['userId', 'achievementCode'], {
  unique: true,
})
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  achievementCode: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ default: '' })
  eventType: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 1 })
  target: number;

  @Column({ default: false })
  completed: boolean;

  @Column({ default: false })
  claimed: boolean;

  @Column({ default: 'gold' })
  rewardType: string;

  @Column({ default: '100' })
  rewardValue: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
