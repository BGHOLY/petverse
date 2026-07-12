import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('guild_boss_records')
@Index(['guildId', 'userId', 'weekKey'], { unique: true })
export class GuildBossRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: number;

  @Column()
  userId: number;

  @Column()
  weekKey: string;

  @Column({ default: 0 })
  damage: number;

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: false })
  baseRewardClaimed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
