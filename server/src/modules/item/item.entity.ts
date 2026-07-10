import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  itemCode: string;

  @Column({ length: 80 })
  name: string;

  @Column({ default: '' })
  description: string;

  @Column({ default: 'material' })
  type: string;

  @Column({ default: 1 })
  rarity: number;

  @Column({ default: 999999 })
  maxStack: number;

  @Column({ default: true })
  usable: boolean;

  @Column({ default: '' })
  effect: string;

  @Column({ type: 'float', default: 0 })
  effectValue: number;

  @Column({ type: 'simple-json', nullable: true })
  effectData: Record<string, any>;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: '2.1.0' })
  version: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
