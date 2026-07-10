import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_operation_records')
@Index(['userId', 'operationType', 'requestId'], { unique: true })
export class GameOperationRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 50 })
  operationType: string;

  @Column({ length: 80 })
  requestId: string;

  @Column({ default: 'processing' })
  status: string;

  @Column({ type: 'simple-json', nullable: true })
  cost: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  reward: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  result: Record<string, any>;

  @Column({ default: '2.2.0' })
  configVersion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
