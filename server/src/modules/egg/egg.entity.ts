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

  @Column({ default: 100 })
  quality: number;

  @Column({ default: '' })
  species: string;

  @Column({ default: 'PET004' })
  speciesCode: string;

  @Column({ default: false })
  isMutant: boolean;

  @Column({ default: 'unknown' })
  gender: string;

  @Column({ default: 3 })
  skillSlotCount: number;

  @Column({ default: 1200 })
  hpAptitude: number;

  @Column({ default: 1200 })
  attackAptitude: number;

  @Column({ default: 1200 })
  defenseAptitude: number;

  @Column({ default: 1200 })
  magicAptitude: number;

  @Column({ default: 1200 })
  speedAptitude: number;

  @Column({ type: 'float', default: 1.1 })
  growth: number;

  @Column({ default: 1 })
  generation: number;

  @Column({ default: 0 })
  specialSkillCount: number;

  @Column({ default: 'AAAA' })
  geneCode: string;

  @Column({ default: 12 })
  geneScore: number;

  @Column({ default: 'normal' })
  bodyType: string;

  @Column({ default: 'white' })
  color: string;

  @Column({ default: 'none' })
  pattern: string;

  @Column({ type: 'simple-json', nullable: true })
  inheritedSkills: any[];

  @Column({ type: 'simple-json', nullable: true })
  mutationData: any;

  @Column({ type: 'simple-json', nullable: true })
  parentSnapshot: any;

  @Column({ type: 'simple-json', nullable: true })
  offspringData: any;

  @Column({ default: '' })
  randomSeed: string;

  @Column({ default: '2.0.0' })
  configVersion: string;

  @Column({ default: 'unhatched' })
  status: string;

  @Column({ default: '' })
  source: string;

  @Column({ default: 0 })
  hatchDurationSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  hatchReadyAt: Date;

  @Column({ default: 0 })
  incubatorSlot: number;

  @Column({ default: 0 })
  hatchedPetId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
