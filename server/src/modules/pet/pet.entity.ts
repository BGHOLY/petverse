import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ownerId: number;

  @Column()
  nickname: string;

  @Column()
  species: string;

  @Column({ default: 'PET004' })
  speciesCode: string;

  @Column({ default: false })
  isMutant: boolean;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: 'none' })
  tradeStatus: string;

  @Column({ default: 0 })
  tradeListingId: number;

  @Column({ default: 'unknown' })
  gender: string;

  @Column({ default: 0 })
  breedCount: number;

  @Column({ default: 20 })
  breedLimit: number;

  @Column({ default: 100 })
  fertility: number;

  @Column({ type: 'timestamp', nullable: true })
  fertilityUpdatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastBreedAt: Date;

  @Column({ default: 0 })
  fusionCount: number;

  @Column({ default: 1 })
  rarity: number;

  @Column({ default: '普通 Common' })
  rarityName: string;

  @Column({ default: 100 })
  quality: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 100 })
  nextExp: number;

  // 兼容旧战斗与前端字段。新最终属性由资质、成长和等级计算。
  @Column({ default: 100 })
  hp: number;

  @Column({ default: 20 })
  attack: number;

  @Column({ default: 20 })
  defense: number;

  @Column({ default: 20 })
  agility: number;

  @Column({ default: 20 })
  speed: number;

  @Column({ default: 20 })
  intelligence: number;

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

  @Column({ default: 'created' })
  sourceType: string;

  @Column({ default: '2.3.0' })
  configVersion: string;

  @Column({ default: 100 })
  hunger: number;

  @Column({ default: 100 })
  happiness: number;

  @Column({ default: 100 })
  cleanliness: number;

  @Column({ default: 100 })
  stamina: number;

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

  @Column({ default: 0 })
  fatherId: number;

  @Column({ default: 0 })
  motherId: number;

  @Column({ default: false })
  married: boolean;

  @Column({ default: 0 })
  partnerId: number;

  @Column({ default: 0 })
  marriedPetId: number;

  @Column({ default: 3 })
  skillSlotCount: number;

  @Column({ type: 'simple-json', nullable: true })
  skills: any[];

  @Column({ default: false })
  isEgg: boolean;

  @Column({ type: 'timestamp', nullable: true })
  hatchTime: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastStatusUpdate: Date;

  @CreateDateColumn()
  createTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
