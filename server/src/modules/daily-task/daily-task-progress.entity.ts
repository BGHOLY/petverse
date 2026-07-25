import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('daily_task_progress')
@Index(['userId', 'taskCode', 'periodKey'], { unique: true })
export class DailyTaskProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 60 })
  taskCode: string;

  @Column({ length: 20 })
  category: string;

  @Column({ length: 60 })
  targetType: string;

  @Column()
  targetValue: number;

  @Column({ default: 0 })
  currentValue: number;

  @Column({ type: 'simple-json', nullable: true })
  reward: Record<string, any>;

  @Column({ length: 20 })
  resetType: string;

  @Column({ length: 20 })
  periodKey: string;

  @Column({ default: false })
  claimed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
