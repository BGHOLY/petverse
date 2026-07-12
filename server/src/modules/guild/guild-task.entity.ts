import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('guild_tasks')
@Index(['guildId', 'userId', 'weekKey', 'taskCode'], { unique: true })
export class GuildTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: number;

  @Column()
  userId: number;

  @Column()
  weekKey: string;

  @Column()
  taskCode: string;

  @Column()
  title: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 1 })
  target: number;

  @Column({ default: false })
  claimed: boolean;

  @Column({ default: 80 })
  contributionReward: number;

  @Column({ default: 20 })
  formationKnowledgeReward: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
