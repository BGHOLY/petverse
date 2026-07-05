import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('daily_tasks')
export class DailyTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: false })
  signCompleted: boolean;

  @Column({ default: false })
  feedCompleted: boolean;

  @Column({ default: false })
  towerCompleted: boolean;

  @Column({ default: false })
  battleCompleted: boolean;

  @Column({ default: false })
  rewardClaimed: boolean;

  @Column({
    type: 'date',
  })
  taskDate: string;

  @CreateDateColumn()
  createTime: Date;
}