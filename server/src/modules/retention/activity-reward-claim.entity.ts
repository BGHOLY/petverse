import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('activity_reward_claims')
@Index(['userId', 'activityId', 'cycleId', 'tierCode'], { unique: true })
export class ActivityRewardClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 60 })
  activityId: string;

  @Column({ length: 20 })
  cycleId: string;

  @Column({ length: 60 })
  tierCode: string;

  @Column({ type: 'timestamp' })
  claimedAt: Date;

  @Column({ length: 120 })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
