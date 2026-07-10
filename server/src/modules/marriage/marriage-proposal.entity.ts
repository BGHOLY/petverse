import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marriage_proposals')
@Index(['targetUserId', 'status'])
@Index(['proposerPetId', 'targetPetId', 'status'])
export class MarriageProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proposerUserId: number;

  @Column()
  targetUserId: number;

  @Column()
  proposerPetId: number;

  @Column()
  targetPetId: number;

  @Column({ default: '' })
  message: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ default: 0 })
  marriageId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
