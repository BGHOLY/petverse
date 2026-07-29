import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('expeditions')
@Index(['userId', 'requestId'], { unique: true })
export class Expedition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 80 })
  requestId: string;

  @Column({ length: 32 })
  mapCode: string;

  @Column()
  durationMinutes: number;

  @Column({ type: 'simple-json' })
  petIds: number[];

  @Column({ default: 'active', length: 20 })
  status: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @Column({ length: 120 })
  rewardSeed: string;

  @Column({ type: 'simple-json', nullable: true })
  rewards: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  modifiers: Record<string, any>;

  @Column({ default: '1.0.0' })
  configVersion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
