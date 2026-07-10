
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('seasons')
@Index(['seasonCode'], { unique: true })
export class Season {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  seasonCode: string;

  @Column({ length: 80 })
  name: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ default: 'pending' })
  settlementStatus: string;

  @Column({ default: '' })
  settlementRequestId: string;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
