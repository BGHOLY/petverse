import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('world_exploration_progress')
@Index(['userId'], { unique: true })
export class WorldExplorationProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'simple-json', nullable: true })
  regions: Record<string, any>;

  @Column({ default: 'moon-forest' })
  currentRegionCode: string;

  @Column({ default: '' })
  dailyDate: string;

  @Column({ default: 0 })
  dailyNestWins: number;

  @Column({ default: 0 })
  storedNestAttempts: number;

  @Column({ default: false })
  monthlyPass: boolean;

  @Column({ default: 0 })
  extraDailyAttempts: number;

  @Column({ default: 0 })
  epicPity: number;

  @Column({ default: 0 })
  legendaryPity: number;

  @Column({ default: 0 })
  mutationPity: number;

  @Column({ type: 'simple-json', nullable: true })
  settledSessionIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
