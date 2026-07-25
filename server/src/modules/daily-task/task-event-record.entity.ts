import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('task_event_records')
@Index(['userId', 'eventType', 'eventId'], { unique: true })
export class TaskEventRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 60 })
  eventType: string;

  @Column({ length: 120 })
  eventId: string;

  @Column({ default: 1 })
  amount: number;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
