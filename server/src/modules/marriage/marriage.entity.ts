import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marriages')
@Index(['ownerAId', 'status'])
@Index(['ownerBId', 'status'])
export class Marriage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  petAId: number;

  @Column()
  petBId: number;

  @Column()
  ownerAId: number;

  @Column()
  ownerBId: number;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 0 })
  eggCount: number;

  @Column({ default: 0 })
  nextEggOwnerId: number;

  @Column({ default: 0 })
  lastEggOwnerId: number;

  @Column({ default: 0 })
  proposalId: number;

  @Column({ type: 'timestamp', nullable: true })
  cooldownEndAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
