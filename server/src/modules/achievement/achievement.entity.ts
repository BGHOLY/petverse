import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  achievementCode: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ default: false })
  claimed: boolean;

  @Column({ default: 'gold' })
  rewardType: string;

  @Column({ default: '100' })
  rewardValue: string;

  @CreateDateColumn()
  createTime: Date;
}