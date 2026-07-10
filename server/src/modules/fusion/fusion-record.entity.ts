import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('fusion_records')
@Index(['ownerId', 'requestId'], { unique: true })
export class FusionRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column({ length: 64 })
  requestId: string;

  @Column()
  parentAId: number;

  @Column()
  parentBId: number;

  @Column({ default: 0 })
  resultPetId: number;

  @Column({ default: '' })
  seed: string;

  @Column({ type: 'simple-json', nullable: true })
  parentSnapshot: any;

  @Column({ type: 'simple-json', nullable: true })
  resultBlueprint: any;

  @Column({ default: 'success' })
  status: string;

  @Column({ default: '2.0.0' })
  configVersion: string;

  @CreateDateColumn()
  createdAt: Date;
}
