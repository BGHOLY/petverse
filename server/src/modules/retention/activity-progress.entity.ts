import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('activity_progress')
@Index(['userId', 'activityId', 'cycleId'], { unique: true })
export class ActivityProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 60 })
  activityId: string;

  @Column({ length: 20 })
  cycleId: string;

  @Column({ default: 0 })
  points: number;

  @Column({ type: 'timestamp', nullable: true })
  lastProgressAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
