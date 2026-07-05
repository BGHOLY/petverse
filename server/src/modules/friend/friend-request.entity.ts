import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('friend_requests')
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fromUserId: number;

  @Column()
  toUserId: number;

  @Column({
    default: 'pending',
  })
  status: string;

  @CreateDateColumn()
  createTime: Date;
}