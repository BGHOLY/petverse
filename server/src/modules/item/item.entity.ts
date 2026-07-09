import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  itemCode: string;

  @Column({ length: 50 })
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

  @Column({ default: 0 })
  effectValue: number;

  @CreateDateColumn()
  createTime: Date;
}
