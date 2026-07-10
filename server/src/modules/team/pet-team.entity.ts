import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pet_teams')
@Index(['userId'], { unique: true })
export class PetTeam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'simple-json', nullable: true })
  petIds: number[];

  @Column({ default: 'default' })
  name: string;

  @Column({ default: '2.1.0' })
  version: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
