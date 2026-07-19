import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('battle_sessions_v10')
@Index(['userId', 'status'])
@Index(['battleId'], { unique: true })
export class BattleSessionV10 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64, nullable: true })
  battleId: string;

  @Column()
  userId: number;

  @Column({ default: 'pve' })
  mode: string;

  @Column({ default: '' })
  chapterCode: string;

  @Column({ default: '' })
  regionCode: string;

  @Column({ default: '' })
  stageCode: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 1 })
  round: number;

  @Column({ default: 25 })
  maxRounds: number;

  @Column({ default: 'dragon' })
  formationCode: string;

  @Column({ default: 'dragon' })
  enemyFormationCode: string;

  @Column({ type: 'simple-json', nullable: true })
  leftTeam: any[];

  @Column({ type: 'simple-json', nullable: true })
  rightTeam: any[];

  @Column({ type: 'simple-json', nullable: true })
  cooldowns: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  tactics: Record<string, any>;

  @Column({
    type: 'longtext',
    nullable: true,
    transformer: {
      to: (value: any[]) => JSON.stringify(value || []),
      from: (value: string | null) => {
        if (!value) return [];
        try { return JSON.parse(value); } catch { return []; }
      },
    },
  })
  battleLog: any[];

  @Column({ default: '' })
  winnerSide: string;

  @Column({ default: false })
  bossBattle: boolean;

  @Column({ default: false })
  settled: boolean;

  @Column({ default: 'pending' })
  rewardStatus: string;

  @Column({ default: '' })
  settlementKey: string;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rewardClaimedAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  resultSnapshot: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  processedCommandIds: string[];

  @Column({ type: 'simple-json', nullable: true })
  rewards: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
