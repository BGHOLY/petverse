import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('guild_expeditions')
@Index(['userId', 'status'])
export class GuildExpedition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: number;

  @Column()
  userId: number;

  @Column({ type: 'simple-json', nullable: true })
  petIds: number[];

  @Column({ default: 'running' })
  status: string;

  @Column({ default: 'forest' })
  routeCode: string;

  @Column({ type: 'timestamp' })
  finishAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  reward: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
