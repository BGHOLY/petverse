
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('friend_requests')
@Index(['fromUserId', 'toUserId', 'status'])
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fromUserId: number;

  @Column()
  toUserId: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ default: '' })
  message: string;

  @Column({ type: 'timestamp', nullable: true })
  handledAt: Date;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
