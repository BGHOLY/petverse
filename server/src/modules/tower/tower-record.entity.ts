import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tower_records')
export class TowerRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: 1 })
  currentFloor: number;

  @Column({ default: 1 })
  maxFloor: number;

  @Column({ default: 0 })
  totalRewardGold: number;

  @CreateDateColumn()
  createTime: Date;
}