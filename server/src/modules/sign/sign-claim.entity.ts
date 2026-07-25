import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sign_claims')
@Index(['userId', 'rewardDate'], { unique: true })
@Index(['userId', 'cycleId', 'dayIndex'], { unique: true })
export class SignClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 40 })
  cycleId: string;

  @Column()
  dayIndex: number;

  @Column({ length: 10 })
  rewardDate: string;

  @Column({ type: 'timestamp' })
  claimedAt: Date;

  @Column({ length: 120 })
  idempotencyKey: string;

  @Column({ type: 'simple-json', nullable: true })
  reward: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
