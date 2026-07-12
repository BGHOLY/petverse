import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('guilds')
export class Guild {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 0 })
  funds: number;

  @Column({ default: 0 })
  weeklyActivity: number;

  @Column({ default: 30 })
  memberLimit: number;

  @Column({ default: '一起培养宝宝，轻松参与公会玩法。' })
  notice: string;

  @Column({ default: '' })
  bossWeekKey: string;

  @Column({ default: 1000000 })
  bossMaxHp: number;

  @Column({ default: 1000000 })
  bossHp: number;

  @Column({ default: 1 })
  bossPhase: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
