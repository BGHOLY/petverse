import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('task_activity_claims')
@Index(['userId', 'periodKey', 'threshold'], { unique: true })
export class TaskActivityClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 20 })
  periodKey: string;

  @Column()
  threshold: number;

  @Column({ type: 'timestamp' })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
