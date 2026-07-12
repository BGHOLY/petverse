import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('formation_wallets')
@Index(['userId'], { unique: true })
export class FormationWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: 0 })
  knowledge: number;

  @Column({ default: 0 })
  cores: number;

  @Column({ default: '' })
  dailyKey: string;

  @Column({ default: 0 })
  dailyPurchasedKnowledge: number;

  @Column({ default: '' })
  weeklyKey: string;

  @Column({ default: 0 })
  weeklyPurchasedCores: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
