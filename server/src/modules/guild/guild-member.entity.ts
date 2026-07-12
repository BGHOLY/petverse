import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('guild_members')
@Index(['userId'], { unique: true })
@Index(['guildId', 'userId'], { unique: true })
export class GuildMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: number;

  @Column()
  userId: number;

  @Column({ default: 'member' })
  role: string;

  @Column({ default: 0 })
  contribution: number;

  @Column({ default: 0 })
  weeklyContribution: number;

  @Column({ default: '' })
  contributionWeekKey: string;

  @Column({ default: '' })
  lastSignDate: string;

  @Column({ default: '' })
  bossAttemptDate: string;

  @Column({ default: 0 })
  bossAttemptsToday: number;

  @Column({ default: 0 })
  carriedBossAttempts: number;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
