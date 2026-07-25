import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reward_claims')
@Index(['userId', 'businessType', 'businessId'], { unique: true })
@Index(['userId', 'idempotencyKey'], { unique: true })
export class RewardClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 50 })
  businessType: string;

  @Column({ length: 120 })
  businessId: string;

  @Column({ length: 120 })
  idempotencyKey: string;

  @Column({ default: 'processing' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  reward: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
