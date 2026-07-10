import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  skillCode: string;

  @Column({ default: '' })
  familyCode: string;

  @Column()
  name: string;

  @Column({ default: '' })
  description: string;

  @Column({ default: 1 })
  rarity: number;

  @Column({ default: 'low' })
  tier: string;

  @Column({ default: 'passive' })
  type: string;

  @Column({ default: 'utility' })
  category: string;

  @Column({ type: 'float', default: 0 })
  power: number;

  @Column({ type: 'float', default: 0 })
  triggerRate: number;

  @Column({ default: '' })
  effect: string;

  @Column({ type: 'simple-json', nullable: true })
  effectData: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  triggerLimit: Record<string, number>;

  @Column({ default: '' })
  conflictGroup: string;

  @Column({ type: 'simple-json', nullable: true })
  roleAffinity: string[];

  @Column({ type: 'float', default: 1 })
  inheritanceWeight: number;

  @Column({ default: true })
  canPurchase: boolean;

  @Column({ default: true })
  canLock: boolean;

  @Column({ default: true })
  canOverwrite: boolean;

  @Column({ default: true })
  canInherit: boolean;

  @Column({ default: '' })
  speciesCode: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: '2.0.0' })
  version: string;

  @CreateDateColumn()
  createdAt: Date;
}
