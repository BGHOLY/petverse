
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('season_players')
@Index(['seasonCode', 'userId'], { unique: true })
export class SeasonPlayer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  seasonCode: string;

  @Column()
  userId: number;

  @Column({ default: 1000 })
  rating: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  draws: number;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  towerScore: number;

  @Column({ default: 0 })
  powerScore: number;

  @Column({ default: 0 })
  rank: number;

  @Column({ default: 'unranked' })
  rewardTier: string;

  @Column({ default: false })
  rewardIssued: boolean;

  @Column({ default: 0 })
  rewardMailId: number;

  @Column({ type: 'simple-json', nullable: true })
  snapshot: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
