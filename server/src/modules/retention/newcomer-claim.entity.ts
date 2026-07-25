import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('newcomer_reward_claims')
@Index(['userId', 'tierCode'], { unique: true })
export class NewcomerClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 60 })
  tierCode: string;

  @Column({ type: 'timestamp' })
  claimedAt: Date;

  @Column({ length: 120 })
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
