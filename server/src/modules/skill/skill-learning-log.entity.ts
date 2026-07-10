import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('skill_learning_logs')
export class SkillLearningLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column()
  petId: number;

  @Column()
  bookSkillCode: string;

  @Column({ type: 'simple-json', nullable: true })
  beforeSkills: any[];

  @Column({ type: 'simple-json', nullable: true })
  afterSkills: any[];

  @Column({ type: 'simple-json', nullable: true })
  lockedSkillCodes: string[];

  @Column({ default: '' })
  overwrittenSkillCode: string;

  @Column({ default: '' })
  seed: string;

  @Column({ default: '2.0.0' })
  configVersion: string;

  @CreateDateColumn()
  createdAt: Date;
}
