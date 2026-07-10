
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('friends')
@Index(['userId', 'friendUserId'], { unique: true })
export class Friend {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  friendUserId: number;

  @CreateDateColumn()
  createTime: Date;
}
