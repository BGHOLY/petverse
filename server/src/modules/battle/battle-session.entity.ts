import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('battle_sessions_v10')
@Index(['userId', 'status'])
export class BattleSessionV10 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: 'pve' })
  mode: string;

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

  @Column({ type: 'simple-json', nullable: true })
  battleLog: any[];

  @Column({ default: '' })
  winnerSide: string;

  @Column({ default: false })
  bossBattle: boolean;

  @Column({ default: false })
  settled: boolean;

  @Column({ type: 'simple-json', nullable: true })
  rewards: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
