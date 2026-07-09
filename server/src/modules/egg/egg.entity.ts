import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('eggs')
export class Egg {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column({ default: 0 })
  parentAId: number;

  @Column({ default: 0 })
  parentBId: number;

  @Column({ default: 1 })
  rarityPotential: number;

  @Column({ default: 'unhatched' })
  status: string;

  @Column({ default: '' })
  source: string;

  @Column({ default: 0 })
  hatchedPetId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
