import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('guild_help_requests')
@Index(['guildId', 'userId', 'dayKey', 'resourceCode'], { unique: true })
export class GuildHelpRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: number;

  @Column()
  userId: number;

  @Column()
  dayKey: string;

  @Column()
  resourceCode: string;

  @Column({ default: 1 })
  requested: number;

  @Column({ default: 0 })
  received: number;

  @Column({ type: 'simple-json', nullable: true })
  donorUserIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
