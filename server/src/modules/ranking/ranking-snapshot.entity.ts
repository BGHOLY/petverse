
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ranking_snapshots')
@Index(['seasonCode', 'rankingType', 'rank'])
export class RankingSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  seasonCode: string;

  @Column({ length: 30 })
  rankingType: string;

  @Column()
  userId: number;

  @Column({ default: 0 })
  petId: number;

  @Column()
  rank: number;

  @Column({ default: 0 })
  score: number;

  @Column({ type: 'simple-json', nullable: true })
  snapshotData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
