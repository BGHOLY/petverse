import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('guild_donations')
export class GuildDonation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: number;

  @Column()
  userId: number;

  @Column({ default: 'gold' })
  donationType: string;

  @Column({ default: 0 })
  amount: number;

  @Column({ default: 0 })
  contribution: number;

  @Column({ default: '' })
  dayKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
