import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('formation_upgrade_logs')
export class FormationUpgradeLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  formationCode: string;

  @Column()
  fromLevel: number;

  @Column()
  toLevel: number;

  @Column({ default: 0 })
  knowledgeCost: number;

  @Column({ default: 0 })
  coreCost: number;

  @Column({ default: 0 })
  diamondCost: number;

  @CreateDateColumn()
  createdAt: Date;
}
