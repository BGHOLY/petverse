
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  openid: string;

  @Column({ default: '' })
  unionid: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ default: '' })
  avatar: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  vipLevel: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 1000 })
  gold: number;

  @Column({ default: 100 })
  diamond: number;

  @Column({ default: 50 })
  petCapacity: number;

  @CreateDateColumn()
  createTime: Date;
}
